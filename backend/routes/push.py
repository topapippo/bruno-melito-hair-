from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from datetime import datetime, timezone, timedelta
import os
import json

router = APIRouter()

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "admin@brunomelito.it")


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


@router.get("/push/vapid-key")
async def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe_push(sub: PushSubscription):
    existing = await db.push_subscriptions.find_one(
        {"endpoint": sub.endpoint}, {"_id": 0}
    )
    if existing:
        return {"status": "already_subscribed"}

    await db.push_subscriptions.insert_one({
        "endpoint": sub.endpoint,
        "keys": sub.keys,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    })
    return {"status": "subscribed"}


@router.delete("/push/unsubscribe")
async def unsubscribe_push(sub: PushSubscription):
    await db.push_subscriptions.delete_one({"endpoint": sub.endpoint})
    return {"status": "unsubscribed"}


@router.post("/push/send-reminders")
async def send_push_reminders():
    """Send push reminders for appointments in the next 24 hours."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        raise HTTPException(status_code=500, detail="pywebpush not installed")

    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID keys not configured")

    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(hours=24)
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")

    appointments = await db.appointments.find({
        "date": {"$in": [today_str, tomorrow_str]},
        "status": {"$nin": ["cancelled", "completed"]},
        "push_reminded": {"$ne": True},
    }, {"_id": 0}).to_list(200)

    if not appointments:
        return {"sent": 0, "message": "No appointments to remind"}

    subscriptions = await db.push_subscriptions.find(
        {"active": True}, {"_id": 0}
    ).to_list(500)

    if not subscriptions:
        return {"sent": 0, "message": "No push subscriptions"}

    sent = 0
    failed = 0

    # Reconstruct PEM from base64 DER
    private_key_b64 = VAPID_PRIVATE_KEY
    # Build proper PEM
    pem_lines = ["-----BEGIN PRIVATE KEY-----"]
    # Split into 64-char lines
    for i in range(0, len(private_key_b64), 64):
        pem_lines.append(private_key_b64[i:i+64])
    pem_lines.append("-----END PRIVATE KEY-----")
    private_pem = "\n".join(pem_lines)

    for apt in appointments:
        client_name = apt.get("client_name", "Cliente")
        apt_date = apt.get("date", "")
        apt_time = apt.get("time", "")
        services_names = ", ".join([s.get("name", "") for s in apt.get("services", [])])

        payload = json.dumps({
            "title": "Promemoria Appuntamento",
            "body": f"{client_name}, ricordati del tuo appuntamento {apt_date} alle {apt_time}. Servizi: {services_names}",
            "icon": "/favicon.ico",
            "url": "/",
        })

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub["endpoint"],
                        "keys": sub["keys"],
                    },
                    data=payload,
                    vapid_private_key=private_pem,
                    vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"},
                )
                sent += 1
            except Exception as e:
                failed += 1
                if "410" in str(e) or "404" in str(e):
                    await db.push_subscriptions.update_one(
                        {"endpoint": sub["endpoint"]},
                        {"$set": {"active": False}}
                    )

        await db.appointments.update_one(
            {"id": apt["id"]},
            {"$set": {"push_reminded": True}}
        )

    return {"sent": sent, "failed": failed, "appointments": len(appointments)}
