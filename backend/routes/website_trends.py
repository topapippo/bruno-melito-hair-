from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from auth import get_current_user
from database import db
import uuid
import requests
import base64
import os
from datetime import datetime, timezone

router = APIRouter()

_IMGBB_KEY = os.environ.get("IMGBB_API_KEY", "")


def _upload_image_imgbb(content: bytes) -> str:
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(content))
    w, h = img.size
    side = min(w, h)
    img = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    img = img.resize((800, 800), Image.LANCZOS)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode()
    resp = requests.post("https://api.imgbb.com/1/upload", data={"key": _IMGBB_KEY, "image": b64}, timeout=30)
    data = resp.json()
    if not data.get("success"):
        raise Exception("Upload fallito")
    return data["data"]["url"]


_TREND_DEFAULTS = [
    {"title": "Bixie Cut", "desc": "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png", "badge": "🔥 Trend", "color_code": "#FFD93D", "order": 0},
    {"title": "Butterfly Cut", "desc": "Volume e movimento pazzesco senza rinunciare alle lunghezze.", "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png", "badge": "✨ Virale", "color_code": "#FF6B9D", "order": 1},
    {"title": "Biondo Burro", "desc": "Luce pura e cremosa per risplendere sotto il sole del 2026.", "img": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg", "badge": "☀️ Estate", "color_code": "#A8DAFF", "order": 2},
]


@router.get("/website-trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    trends = await db.website_trends.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("order", 1).to_list(20)
    if not trends:
        to_insert = [
            {**d, "id": str(uuid.uuid4()), "user_id": current_user["id"],
             "created_at": datetime.now(timezone.utc).isoformat()}
            for d in _TREND_DEFAULTS
        ]
        await db.website_trends.insert_many(to_insert)
        for doc in to_insert:
            doc.pop("_id", None)
        trends = to_insert
    return trends


@router.get("/website-trends/public")
async def get_trends_public():
    """Endpoint pubblico — usato da TrendGallery sul sito."""
    trends = await db.website_trends.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    return trends


@router.post("/website-trends")
async def create_trend(data: dict, current_user: dict = Depends(get_current_user)):
    trend_id = str(uuid.uuid4())
    count = await db.website_trends.count_documents({"user_id": current_user["id"]})
    doc = {
        "id": trend_id,
        "user_id": current_user["id"],
        "title": data.get("title", "Nuovo trend"),
        "desc": data.get("desc", ""),
        "img": data.get("img", ""),
        "badge": data.get("badge", ""),
        "color_code": data.get("color_code", ""),
        "order": count,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.website_trends.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/website-trends/{trend_id}")
async def update_trend(trend_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if k in ("title", "desc", "img", "badge", "color_code", "order")}
    await db.website_trends.update_one(
        {"id": trend_id, "user_id": current_user["id"]},
        {"$set": update}
    )
    return {"ok": True}


@router.delete("/website-trends/{trend_id}")
async def delete_trend(trend_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.website_trends.delete_one({"id": trend_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trend non trovato")
    return {"ok": True}


@router.post("/website-trends/upload-image")
async def upload_trend_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File non valido")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 10 MB)")
    if not _IMGBB_KEY:
        raise HTTPException(status_code=500, detail="IMGBB_API_KEY non configurata")
    try:
        url = _upload_image_imgbb(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore upload: {str(e)}")
    return {"url": url}
