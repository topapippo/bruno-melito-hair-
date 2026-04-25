from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
from database import db
from routes.auth import get_current_user

router = APIRouter()


class BlockedSlotCreate(BaseModel):
    type: str  # "one-time", "recurring", "daily", "monthly"
    day_of_week: Optional[str] = None  # "lunedì", ... (for recurring)
    date: Optional[str] = None  # "2026-04-01" (for one-time)
    day_of_month: Optional[int] = None  # 1-31 (for monthly)
    start_time: str  # "13:00"
    end_time: str  # "14:00"
    reason: Optional[str] = ""


@router.get("/blocked-slots")
async def get_blocked_slots(current_user: dict = Depends(get_current_user)):
    slots = await db.blocked_slots.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(500)
    return slots


@router.post("/blocked-slots")
async def create_blocked_slot(data: BlockedSlotCreate, current_user: dict = Depends(get_current_user)):
    if data.type == "recurring" and not data.day_of_week:
        raise HTTPException(status_code=400, detail="Giorno della settimana richiesto per blocchi ricorrenti")
    if data.type == "one-time" and not data.date:
        raise HTTPException(status_code=400, detail="Data richiesta per blocchi singoli")
    if data.type == "monthly" and not data.day_of_month:
        raise HTTPException(status_code=400, detail="Giorno del mese richiesto per blocchi mensili")
    slot = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": data.type,
        "day_of_week": data.day_of_week,
        "date": data.date,
        "day_of_month": data.day_of_month,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "reason": data.reason or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_slots.insert_one(slot)
    del slot["_id"]
    return slot


@router.delete("/blocked-slots/{slot_id}")
async def delete_blocked_slot(slot_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.blocked_slots.delete_one({"id": slot_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocco non trovato")
    return {"success": True}


@router.get("/public/blocked-slots/{date}")
async def get_public_blocked_for_date(date: str):
    """Get blocked time slots for a specific date (public, for booking page)."""
    user = await db.users.find_one({"email": "admin@brunomelito.it"}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        return []
    user_id = user["id"]

    # Parse date to get day of week in Italian
    from datetime import datetime as dt
    day_names = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    try:
        d = dt.strptime(date, "%Y-%m-%d")
        day_of_week = day_names[d.weekday()]
    except ValueError:
        return []

    # one-time blocks for this date
    one_time = await db.blocked_slots.find(
        {"user_id": user_id, "type": "one-time", "date": date}, {"_id": 0}
    ).to_list(100)
    # recurring weekly blocks for this day of week
    recurring = await db.blocked_slots.find(
        {"user_id": user_id, "type": "recurring", "day_of_week": day_of_week}, {"_id": 0}
    ).to_list(100)
    # daily blocks (apply every day)
    daily = await db.blocked_slots.find(
        {"user_id": user_id, "type": "daily"}, {"_id": 0}
    ).to_list(100)
    # monthly blocks for this day-of-month
    monthly = await db.blocked_slots.find(
        {"user_id": user_id, "type": "monthly", "day_of_month": d.day}, {"_id": 0}
    ).to_list(100)

    blocked_times = []
    for slot in one_time + recurring + daily + monthly:
        try:
            sh, sm = map(int, slot["start_time"].split(":"))
            eh, em = map(int, slot["end_time"].split(":"))
        except (ValueError, AttributeError):
            continue
        start_min = sh * 60 + sm
        end_min = eh * 60 + em
        t = start_min
        while t < end_min:
            blocked_times.append(f"{t // 60:02d}:{t % 60:02d}")
            t += 15
    return list(set(blocked_times))
