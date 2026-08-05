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
    sale_price: Optional[float] = 0.0
    notes: Optional[str] = ""


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_stock: Optional[float] = None
    dose_size: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    sale_price: Optional[float] = None
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
        "sale_price": float(data.sale_price or 0),
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


@router.get("/inventory/report")
async def get_inventory_report(
    month: Optional[str] = None,   # formato YYYY-MM, default mese corrente
    current_user: dict = Depends(get_current_user),
):
    """
    Report mensile magazzino:
    - Colori più consumati (da inventory_usage)
    - Prodotti sotto scorta oggi
    """
    now = datetime.now(timezone.utc)
    if month:
        try:
            y, m = map(int, month.split("-"))
        except Exception:
            raise HTTPException(status_code=400, detail="Formato mese non valido (YYYY-MM)")
    else:
        y, m = now.year, now.month

    month_str = f"{y:04d}-{m:02d}"
    date_from = f"{month_str}-01"
    # ultimo giorno del mese
    from calendar import monthrange
    last_day = monthrange(y, m)[1]
    date_to = f"{month_str}-{last_day:02d}"

    # 1. Consumi dal log
    usage_docs = await db.inventory_usage.find(
        {
            "user_id": current_user["id"],
            "date": {"$gte": date_from, "$lte": date_to},
        },
        {"_id": 0, "user_id": 0}
    ).to_list(10000)

    # Aggrega per prodotto
    usage_map = {}
    for u in usage_docs:
        pid = u.get("product_name") or u.get("product_id", "?")
        usage_map[pid] = usage_map.get(pid, 0) + float(u.get("quantity", 0))

    top_consumed = sorted(
        [{"name": k, "quantity": round(v, 2)} for k, v in usage_map.items()],
        key=lambda x: x["quantity"],
        reverse=True
    )[:10]

    # 2. Prodotti sotto scorta oggi
    all_products = await db.inventory.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).to_list(5000)

    low_stock = [
        {"name": p["name"], "total_stock": p["total_stock"], "low_stock_threshold": p["low_stock_threshold"]}
        for p in all_products
        if p.get("total_stock", 0) <= p.get("low_stock_threshold", 0)
    ]

    return {
        "month": month_str,
        "top_consumed": top_consumed,
        "low_stock": low_stock,
        "total_usage_records": len(usage_docs),
    }
