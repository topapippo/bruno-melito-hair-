"""
Test di regressione per i fix di sicurezza (push auth, mass-assignment appuntamenti,
calendario token, no-show). Girano in-process contro l'app FastAPI (ASGITransport),
niente rete esterna: usano il MongoDB di test configurato in conftest.py
(mongodb://localhost:27017/mbhs_test di default, un mongo effimero in CI).

NON toccano mai il database di produzione: database.py non fa più override del
.env locale, quindi le variabili impostate qui/in conftest.py restano valide.
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport

from server import app
from database import db
from auth import create_token

pytestmark = pytest.mark.asyncio


async def _create_user():
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid,
        "email": f"{uid}@test.local",
        "password": "x",
        "name": "Test",
        "salon_name": "Salone Test",
        "created_at": "2024-01-01T00:00:00+00:00",
    })
    return uid, create_token(uid)


async def _create_appointment(uid, **overrides):
    apt_id = str(uuid.uuid4())
    doc = {
        "id": apt_id, "user_id": uid, "client_id": "client-1", "client_name": "Cliente Prova",
        "client_phone": "", "service_ids": [], "services": [], "date": "2030-01-01",
        "time": "10:00", "end_time": "10:30", "total_duration": 30, "total_price": 20.0,
        "status": "scheduled", "notes": "", "paid": False, "source": "manual", "operator_id": "",
    }
    doc.update(overrides)
    await db.appointments.insert_one(doc)
    return apt_id


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestPushAuth:
    """push.py: subscribe/unsubscribe devono richiedere login e restare per-utente."""

    async def test_subscribe_without_token_is_rejected(self, client):
        res = await client.post("/api/push/subscribe", json={"endpoint": "https://x/1", "keys": {}})
        assert res.status_code in (401, 403)

    async def test_subscribe_stores_owning_user(self, client):
        uid, token = await _create_user()
        endpoint = f"https://fcm.example/{uuid.uuid4()}"
        try:
            res = await client.post(
                "/api/push/subscribe",
                json={"endpoint": endpoint, "keys": {"p256dh": "x", "auth": "y"}},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            sub = await db.push_subscriptions.find_one({"endpoint": endpoint})
            assert sub is not None
            assert sub["user_id"] == uid
        finally:
            await db.push_subscriptions.delete_one({"endpoint": endpoint})
            await db.users.delete_one({"id": uid})

    async def test_unsubscribe_cannot_remove_another_users_subscription(self, client):
        uid_a, token_a = await _create_user()
        uid_b, token_b = await _create_user()
        endpoint = f"https://fcm.example/{uuid.uuid4()}"
        try:
            await client.post(
                "/api/push/subscribe", json={"endpoint": endpoint, "keys": {}},
                headers={"Authorization": f"Bearer {token_a}"},
            )
            await client.request(
                "DELETE", "/api/push/unsubscribe", json={"endpoint": endpoint, "keys": {}},
                headers={"Authorization": f"Bearer {token_b}"},
            )
            still_there = await db.push_subscriptions.find_one({"endpoint": endpoint})
            assert still_there is not None, "l'utente B ha potuto cancellare una subscription non sua"
        finally:
            await db.push_subscriptions.delete_one({"endpoint": endpoint})
            await db.users.delete_many({"id": {"$in": [uid_a, uid_b]}})


class TestAppointmentMassAssignment:
    """appointments.py update_appointment: solo i campi in whitelist sono modificabili."""

    async def test_forbidden_fields_are_ignored(self, client):
        uid, token = await _create_user()
        other_uid = str(uuid.uuid4())
        apt_id = await _create_appointment(uid)
        try:
            res = await client.put(
                f"/api/appointments/{apt_id}",
                json={"notes": "aggiornata", "user_id": other_uid, "total_paid": 9999, "status": "completed"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            updated = await db.appointments.find_one({"id": apt_id}, {"_id": 0})
            assert updated["notes"] == "aggiornata"
            assert updated["user_id"] == uid
            assert updated.get("total_paid") != 9999
            assert updated["status"] == "scheduled"
        finally:
            await db.appointments.delete_one({"id": apt_id})
            await db.users.delete_one({"id": uid})

    async def test_allowed_fields_are_applied(self, client):
        uid, token = await _create_user()
        apt_id = await _create_appointment(uid)
        try:
            res = await client.put(
                f"/api/appointments/{apt_id}",
                json={"time": "15:30", "notes": "cambiato orario"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            updated = await db.appointments.find_one({"id": apt_id}, {"_id": 0})
            assert updated["time"] == "15:30"
            assert updated["notes"] == "cambiato orario"
        finally:
            await db.appointments.delete_one({"id": apt_id})
            await db.users.delete_one({"id": uid})


class TestCalendarFeed:
    """calendar.py: feed pubblico raggiungibile solo col token, non con JWT/indovinando."""

    async def test_feed_with_unknown_token_is_404(self, client):
        res = await client.get("/api/calendar/feed/token-inesistente.ics")
        assert res.status_code == 404

    async def test_link_generation_and_public_feed_access(self, client):
        uid, token = await _create_user()
        apt_id = await _create_appointment(uid, date="2099-01-01")
        try:
            link_res = await client.get("/api/calendar/link", headers={"Authorization": f"Bearer {token}"})
            assert link_res.status_code == 200
            feed_path = link_res.json()["feed_path"]

            feed_res = await client.get(feed_path)
            assert feed_res.status_code == 200
            assert "BEGIN:VCALENDAR" in feed_res.text
            assert "Cliente Prova" in feed_res.text
        finally:
            await db.appointments.delete_one({"id": apt_id})
            await db.users.delete_one({"id": uid})


class TestNoShowReminder:
    """reminders.py no-show: segna sempre lo stato, anche senza numero di telefono."""

    async def test_marks_status_even_without_phone(self, client):
        uid, token = await _create_user()
        apt_id = await _create_appointment(uid, client_phone="")
        try:
            res = await client.post(
                f"/api/reminders/no-show/{apt_id}/send",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
            assert res.json()["success"] is False
            updated = await db.appointments.find_one({"id": apt_id}, {"_id": 0})
            assert updated["status"] == "no_show"
        finally:
            await db.appointments.delete_one({"id": apt_id})
            await db.users.delete_one({"id": uid})
