from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import os
from database import db
from auth import get_current_user
from models import SettingsUpdate, UserResponse
from utils import twilio_client, TWILIO_PHONE_NUMBER

router = APIRouter()

@router.put("/settings", response_model=UserResponse)
async def update_settings(data: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], salon_name=user["salon_name"], created_at=user["created_at"])

@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"], "email": current_user["email"],
        "name": current_user["name"], "salon_name": current_user["salon_name"],
        "opening_time": current_user.get("opening_time", "09:00"),
        "closing_time": current_user.get("closing_time", "19:00"),
        "working_days": current_user.get("working_days", ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"]),
        "google_review_link": current_user.get("google_review_link", ""),
        "monthly_target": current_user.get("monthly_target", 0) or 0,
        "make_webhook_url": current_user.get("make_webhook_url", ""),
    }

# ============== PAYMENTS ==============

@router.get("/payments")
async def get_payments(start: str = None, end: str = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if start and end:
        query["date"] = {"$gte": start[:10], "$lte": end[:10]}
    return await db.payments.find(query, {"_id": 0}).sort("date", -1).to_list(1000)

@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    allowed = {"date", "payment_method", "total_paid", "client_name", "notes"}
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato valido da aggiornare")
    result = await db.payments.update_one(
        {"id": payment_id, "user_id": current_user["id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    updated = await db.payments.find_one({"id": payment_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0})
    return updated

@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    return {"success": True}