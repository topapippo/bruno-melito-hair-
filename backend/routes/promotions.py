from cache_utils import invalidate_website_cache
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
from pydantic import BaseModel

from database import db
from auth import get_current_user

router = APIRouter()

class PromoCreate(BaseModel):
    name: str
    description: str
    active: bool = True

@router.post("/promotions")
async def create_promotion(data: PromoCreate, current_user: dict = Depends(get_current_user)):
    promo_id = str(uuid.uuid4())
    promo_doc = {
        "id": promo_id, "user_id": current_user["id"],
        "name": data.name, "description": data.description, "active": data.active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promotions.insert_one(promo_doc)
    invalidate_website_cache()
    return promo_doc

@router.get("/promotions")
async def get_promotions(current_user: dict = Depends(get_current_user)):
    return await db.promotions.find(
        {"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).to_list(50)

@router.delete("/promotions/{promo_id}")
async def delete_promotion(promo_id: str, current_user: dict = Depends(get_current_user)):
    await db.promotions.delete_one({"id": promo_id, "user_id": current_user["id"]})
    invalidate_website_cache()
    return {"status": "ok"}
