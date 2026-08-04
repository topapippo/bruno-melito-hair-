from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from database import db
from auth import get_current_user

router = APIRouter()


@router.get("/notifications/new-bookings")
async def get_new_online_bookings(since: str = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"], "source": "online"}
    if since:
        query["created_at"] = {"$gt": since}
    return await db.appointments.find(query, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(20)


@router.get("/notifications/new-messages")
async def get_new_inbound_messages(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    messages = await db.communication_logs.find(
        {"user_id": uid, "direction": "inbound"}, {"_id": 0}
    ).sort("timestamp", -1).to_list(20)
    if not messages:
        return []
    clients = await db.clients.find(
        {"user_id": uid}, {"_id": 0, "phone": 1, "name": 1}
    ).to_list(5000)
    phone_to_name = {
        c["phone"][-9:]: c.get("name", "Sconosciuto")
        for c in clients if c.get("phone") and len(c["phone"]) >= 9
    }
    for m in messages:
        phone = m.get("phone") or ""
        suffix = phone[-9:] if len(phone) >= 9 else phone
        m["client_name"] = phone_to_name.get(suffix, "Sconosciuto")
    return messages


@router.post("/notifications/mark-seen")
async def mark_bookings_seen(data: dict, current_user: dict = Depends(get_current_user)):
    apt_ids = data.get("appointment_ids", [])
    if apt_ids:
        await db.appointments.update_many(
            {"id": {"$in": apt_ids}, "user_id": current_user["id"]},
            {"$set": {"seen_at": datetime.now(timezone.utc).isoformat()}}
        )
    msg_ids = data.get("message_ids", [])
    if msg_ids:
        await db.communication_logs.update_many(
            {"id": {"$in": msg_ids}, "user_id": current_user["id"]},
            {"$set": {"seen_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"marked": len(apt_ids) + len(msg_ids)}
