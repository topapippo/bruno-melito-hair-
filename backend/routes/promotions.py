from cache_utils import invalidate_website_cache
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel
from typing import Optional

from database import db
from auth import get_current_user

router = APIRouter()

class PromoCreate(BaseModel):
    name: str
    description: str
    active: bool = True
    rule_type: Optional[str] = None
    free_service_name: Optional[str] = None
    linked_service_id: Optional[str] = None  # servizio da aggiungere in cassa selezionando la promo
    promo_code: Optional[str] = None
    show_on_booking: Optional[bool] = None


class PromoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    rule_type: Optional[str] = None
    free_service_name: Optional[str] = None
    linked_service_id: Optional[str] = None
    promo_code: Optional[str] = None
    show_on_booking: Optional[bool] = None

@router.post("/promotions")
async def create_promotion(data: PromoCreate, current_user: dict = Depends(get_current_user)):
    promo_id = str(uuid.uuid4())
    promo_doc = {
        "id": promo_id, "user_id": current_user["id"],
        **data.model_dump(exclude_none=True),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promotions.insert_one(promo_doc)
    invalidate_website_cache()
    promo_doc.pop("_id", None)
    return promo_doc

@router.put("/promotions/{promo_id}")
async def update_promotion(promo_id: str, data: PromoUpdate, current_user: dict = Depends(get_current_user)):
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.promotions.update_one({"id": promo_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    invalidate_website_cache()
    return await db.promotions.find_one({"id": promo_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0})


@router.get("/promotions")
async def get_promotions(current_user: dict = Depends(get_current_user)):
    return await db.promotions.find(
        {"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).to_list(50)

@router.get("/promotions/check/{client_id}")
async def check_client_promotions(client_id: str, current_user: dict = Depends(get_current_user)):
    promos = await db.promotions.find({"user_id": current_user["id"], "active": True}, {"_id": 0}).to_list(20)
    return promos

@router.delete("/promotions/{promo_id}")
async def delete_promotion(promo_id: str, current_user: dict = Depends(get_current_user)):
    await db.promotions.delete_one({"id": promo_id, "user_id": current_user["id"]})
    invalidate_website_cache()
    return {"status": "ok"}
