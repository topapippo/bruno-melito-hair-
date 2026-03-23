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


@router.post("/notifications/mark-seen")
async def mark_bookings_seen(data: dict, current_user: dict = Depends(get_current_user)):
    apt_ids = data.get("appointment_ids", [])
    if apt_ids:
        await db.appointments.update_many(
            {"id": {"$in": apt_ids}, "user_id": current_user["id"]},
            {"$set": {"seen_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"marked": len(apt_ids)}
