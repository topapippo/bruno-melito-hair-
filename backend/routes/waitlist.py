from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user

router = APIRouter()


@router.get("/waitlist")
async def get_waitlist(current_user: dict = Depends(get_current_user)):
    items = await db.waitlist.find(
        {"user_id": current_user["id"], "status": "waiting"},
        {"_id": 0, "user_id": 0}
    ).sort([("preferred_date", 1), ("created_at", 1)]).to_list(200)
    return items


@router.post("/waitlist")
async def add_to_waitlist(data: dict, current_user: dict = Depends(get_current_user)):
    item = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "client_name": data.get("client_name", "").strip(),
        "client_phone": data.get("client_phone", "").strip(),
        "preferred_date": data.get("preferred_date", ""),
        "preferred_time": data.get("preferred_time", ""),
        "service_names": data.get("service_names", ""),
        "notes": data.get("notes", ""),
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not item["client_name"]:
        raise HTTPException(status_code=400, detail="Nome cliente obbligatorio")
    await db.waitlist.insert_one(item)
    item.pop("_id", None)
    return item


@router.put("/waitlist/{item_id}")
async def update_waitlist_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.items() if k not in ("id", "user_id", "_id", "created_at")}
    result = await db.waitlist.update_one(
        {"id": item_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Non trovato")
    return {"success": True}


@router.delete("/waitlist/{item_id}")
async def delete_waitlist_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.waitlist.delete_one({"id": item_id, "user_id": current_user["id"]})
    return {"success": True}
