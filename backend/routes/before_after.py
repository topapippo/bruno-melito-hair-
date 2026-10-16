from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Optional
import uuid
import os

from auth import get_current_user
from database import db
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/before-after", tags=["before-after"])

PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "admin@brunomelito.it")
CATEGORIES = {"colore", "taglio", "trattamento", "stiratura"}
CLOUDINARY_PREFIX = "https://res.cloudinary.com/"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per foto (Render free ha 512 MB di RAM)


class BeforeAfterItem(BaseModel):
    id: str
    user_id: str
    before_url: str
    after_url: str
    title: str
    description: Optional[str] = ""
    category: str
    operator_name: Optional[str] = ""
    sort_order: int = 0
    is_featured: bool = False
    is_deleted: bool = False
    created_at: str


class BeforeAfterCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    operator_name: Optional[str] = ""
    is_featured: bool = False
    before_url: str
    after_url: str


async def _get_salon_owner_id() -> Optional[str]:
    """Id del titolare del salone (stesso criterio di public.py)."""
    owner = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
    return owner["id"] if owner else None


@router.get("/public")
async def get_public_before_after(category: Optional[str] = None):
    """Endpoint pubblico per il sito: solo le trasformazioni del titolare del salone."""
    owner_id = await _get_salon_owner_id()
    if not owner_id:
        return []
    query = {"user_id": owner_id, "is_deleted": {"$ne": True}}
    if category:
        query["category"] = category

    items = await db.before_after.find(query, {"_id": 0, "user_id": 0}) \
        .sort([("is_featured", -1), ("sort_order", 1), ("created_at", -1)]) \
        .to_list(100)
    return items


@router.get("/", response_model=List[BeforeAfterItem])
async def get_before_after_list(current_user: dict = Depends(get_current_user)):
    """Lista admin completa"""
    items = await db.before_after.find(
        {"user_id": current_user["id"], "is_deleted": {"$ne": True}},
        {"_id": 0}
    ).sort([("sort_order", 1), ("created_at", -1)]).to_list(200)
    return items


@router.post("/upload")
async def upload_before_after(
    before_file: UploadFile = File(...),
    after_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Carica coppia prima/dopo su Cloudinary"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    if not all([cloud_name, api_key, api_secret]):
        raise HTTPException(status_code=500, detail="Cloudinary non configurato")

    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)

    async def _read_image(upload: UploadFile) -> bytes:
        if not (upload.content_type or "").startswith("image/"):
            raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
        data = await upload.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Immagine troppo grande (max 10 MB)")
        return data

    before_bytes = await _read_image(before_file)
    after_bytes = await _read_image(after_file)

    try:
        transformation = [{"width": 1200, "height": 1200, "crop": "limit", "quality": "auto:good"}]
        before_result = cloudinary.uploader.upload(before_bytes, resource_type="image", transformation=transformation)
        after_result = cloudinary.uploader.upload(after_bytes, resource_type="image", transformation=transformation)
        return {
            "before_url": before_result.get("secure_url"),
            "after_url": after_result.get("secure_url"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore upload Cloudinary: {str(e)}")


@router.post("/")
async def create_before_after(data: BeforeAfterCreate, current_user: dict = Depends(get_current_user)):
    """Crea nuovo elemento before/after"""
    if data.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoria non valida")
    if not (data.before_url.startswith(CLOUDINARY_PREFIX) and data.after_url.startswith(CLOUDINARY_PREFIX)):
        raise HTTPException(status_code=400, detail="Le immagini devono essere caricate tramite upload")

    count = await db.before_after.count_documents({"user_id": current_user["id"], "is_deleted": {"$ne": True}})

    item = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "before_url": data.before_url,
        "after_url": data.after_url,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "operator_name": data.operator_name,
        "sort_order": count,
        "is_featured": data.is_featured,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.before_after.insert_one(item)
    return {k: v for k, v in item.items() if k != "_id"}


@router.delete("/{item_id}")
async def delete_before_after(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.before_after.update_one(
        {"id": item_id, "user_id": current_user["id"]},
        {"$set": {"is_deleted": True}}
    )
    return {"success": True}
