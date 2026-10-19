from cache_utils import invalidate_website_cache
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import ServiceCreate, ServiceResponse, ServiceUpdate
from routes.categories import category_exists

router = APIRouter()

@router.post("/services", response_model=ServiceResponse)
async def create_service(data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    if not await category_exists(current_user["id"], data.category):
        raise HTTPException(status_code=400, detail="Categoria non valida: scegli una categoria dell'elenco")
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id, "user_id": current_user["id"],
        **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.services.insert_one(service_doc)
    invalidate_website_cache()
    return ServiceResponse(**{k: v for k, v in service_doc.items() if k != "user_id"})

@router.get("/services", response_model=List[ServiceResponse])
async def get_services(current_user: dict = Depends(get_current_user)):
    # Ordina prima per categoria (alfabetico) e poi per sort_order (numerico)
    return await db.services.find(
        {"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).sort([("category", 1), ("sort_order", 1)]).to_list(1000)

@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, data: ServiceUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    new_category = update_data.get("category")
    if new_category is not None:
        current = await db.services.find_one({"id": service_id, "user_id": current_user["id"]}, {"_id": 0, "category": 1})
        # Una categoria "vecchia" non piu' in elenco si puo' tenere; per cambiarla serve una dell'elenco.
        if current and new_category != current.get("category") and not await category_exists(current_user["id"], new_category):
            raise HTTPException(status_code=400, detail="Categoria non valida: scegli una categoria dell'elenco")
    result = await db.services.update_one({"id": service_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    invalidate_website_cache()
    return await db.services.find_one({"id": service_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0})

@router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.services.delete_one({"id": service_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    invalidate_website_cache()
    return {"message": "Servizio eliminato"}
