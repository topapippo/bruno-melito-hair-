from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, BackgroundTasks
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import re
import base64
import requests as http_requests
import logging
import asyncio

from database import db
from auth import get_current_user
from models import PublicBookingRequest, get_loyalty_rewards, LOYALTY_POINTS_PER_EURO
from utils import normalize_phone_wa, send_whatsapp
from cache_utils import invalidate_website_cache, get_cached_website, set_cached_website

router = APIRouter()
logger = logging.getLogger(__name__)

PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "admin@brunomelito.it")

@router.get("/ping")
async def ping(): return {"ok": True}

@router.get("/warmup")
async def warmup(background_tasks: BackgroundTasks):
    background_tasks.add_task(public_get_website)
    return {"ok": True}

async def get_public_admin_user():
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
    if not user:
        user = await db.users.find_one({}, {"_id": 0, "id": 1})
    return user

DEFAULT_WEBSITE_CONFIG = {
    "salon_name": "BRUNO MELITO HAIR",
    "slogan": "Metti la testa a posto!!",
    "subtitle": "SOLO PER APPUNTAMENTO",
    "hero_description": "Scopri l'eccellenza dell'hair styling al Bruno Melito Hair.",
    "primary_color": "#E8477C",
    "accent_color": "#2EC4B6",
    "bg_color": "#0a0a0f",
    "text_color": "#ffffff",
    "hours": {"mar": "08:00 - 19:00", "mer": "08:00 - 19:00", "gio": "08:00 - 19:00", "ven": "08:00 - 19:00", "sab": "08:00 - 19:00"}
}

async def public_get_website():
    cached = get_cached_website()
    if cached: return cached

    user = await get_public_admin_user()
    uid = user["id"] if user else None
    uid_filter = {"user_id": uid} if uid else {}

    (config_raw, reviews, gallery, services, card_templates_raw, operators, promotions, loyalty_rewards_data) = await asyncio.gather(
        db.website_config.find_one(uid_filter, {"_id": 0, "user_id": 0}),
        db.website_reviews.find(uid_filter, {"_id": 0, "user_id": 0}).to_list(100),
        db.website_gallery.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0, "user_id": 0}).sort("sort_order", 1).to_list(200),
        db.services.find(uid_filter, {"_id": 0}).sort("order", 1).to_list(200),
        db.card_templates.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100),
        db.operators.find(uid_filter, {"_id": 0, "user_id": 0}).to_list(50),
        db.promotions.find({"active": True}, {"_id": 0, "user_id": 0}).to_list(20),
        get_loyalty_rewards(uid or ""),
    )

    config = {**DEFAULT_WEBSITE_CONFIG, **(config_raw or {})}
    result = {
        "config": config, "reviews": reviews, "gallery": gallery, "services": services,
        "card_templates": card_templates_raw, "operators": operators,
        "promotions": promotions, "loyalty": {"points_per_euro": LOYALTY_POINTS_PER_EURO, "rewards": loyalty_rewards_data}
    }
    set_cached_website(result)
    return result

@router.get("/public/website")
async def get_website_data(response: Response):
    data = await public_get_website()
    response.headers["Cache-Control"] = "public, max-age=300"
    return data

@router.post("/public/booking")
async def create_public_booking(data: PublicBookingRequest):
    return {"success": True, "appointment_id": str(uuid.uuid4())}

@router.get("/website/config")
async def get_website_config(current_user: dict = Depends(get_current_user)):
    config = await db.website_config.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {**DEFAULT_WEBSITE_CONFIG, **(config or {})}

@router.put("/website/config")
async def update_website_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.website_config.update_one({"user_id": current_user["id"]}, {"$set": data}, upsert=True)
    invalidate_website_cache()
    return {"status": "ok"}

@router.get("/website/reviews")
async def get_website_reviews(current_user: dict = Depends(get_current_user)):
    return await db.website_reviews.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)

@router.get("/website/gallery")
async def get_website_gallery(current_user: dict = Depends(get_current_user)):
    return await db.website_gallery.find({"user_id": current_user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(200)

def init_storage(): pass
