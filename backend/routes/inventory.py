from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel

from database import db
from auth import get_current_user

router = APIRouter()

# Categorie valide: trattamento, colore, permanente, rivendita
VALID_CATEGORIES = {"trattamento", "colore", "permanente", "rivendita"}


class InventoryCreate(BaseModel):
    name: str
    category: str = "trattamento"
    total_stock: float = 0
    dose_size: float = 1
    low_stock_threshold: float = 5
    notes: Optional[str] = ""


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_stock: Optional[float] = None
    dose_size: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    notes: Optional[str] = None


class RestockBody(BaseModel):
    amount: float


def _clean(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k not in ("_id", "user_id")}


@router.get("/inventory")
async def get_inventory(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = {"user_id": current_user["id"]}
    if category:
        query["category"] = category
    return await db.inventory.find(
        query, {"_id": 0, "user_id": 0}
    ).sort("name", 1).to_list(5000)


@router.post("/inventory")
async def create_inventory(data: InventoryCreate, current_user: dict = Depends(get_current_user)):
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Il nome del prodotto è obbligatorio")
    if data.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoria non valida")
    # Evita duplicati per lo stesso utente (case-insensitive)
    existing = await db.inventory.find_one({
        "user_id": current_user["id"],
        "name": {"$regex": f"^{name}$", "$options": "i"},
    })
    if existing:
        raise HTTPException(status_code=409, detail=f"Il prodotto '{name}' esiste già in magazzino")
    product = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": name,
        "category": data.category,
        "total_stock": float(data.total_stock or 0),
        "dose_size": float(data.dose_size or 1),
        "low_stock_threshold": float(data.low_stock_threshold or 0),
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory.insert_one(product)
    return _clean(product)


@router.put("/inventory/{product_id}")
async def update_inventory(product_id: str, data: InventoryUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "category" in update_data and update_data["category"] not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoria non valida")
    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.inventory.update_one(
        {"id": product_id, "user_id": current_user["id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return await db.inventory.find_one({"id": product_id}, {"_id": 0, "user_id": 0})


@router.post("/inventory/{product_id}/restock")
async def restock_inventory(product_id: str, data: RestockBody, current_user: dict = Depends(get_current_user)):
    if data.amount == 0:
        raise HTTPException(status_code=400, detail="La quantità non può essere zero")
    result = await db.inventory.update_one(
        {"id": product_id, "user_id": current_user["id"]},
        {"$inc": {"total_stock": float(data.amount)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return await db.inventory.find_one({"id": product_id}, {"_id": 0, "user_id": 0})


@router.delete("/inventory/{product_id}")
async def delete_inventory(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.inventory.delete_one({"id": product_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return {"success": True}
