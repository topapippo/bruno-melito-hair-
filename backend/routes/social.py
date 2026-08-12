from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from auth import get_current_user
from database import db
import requests
import os
import uuid
import hashlib
import logging
from datetime import datetime, timezone, date
import random

router = APIRouter()
logger = logging.getLogger(__name__)

# Pool di post preimpostati (ne metto alcuni, tu puoi aggiungere i tuoi 48 qui sotto)
_POST_POOL = [
    {
        "type": "estate",
        "title": "S.O.S. Sole & Salsedine",
        "text": "Il sole bacia i belli... ma mette a dura prova i capelli! ☀️🌊\nNon farti trovare impreparata: scopri i nostri trattamenti protettivi per un biondo che non vira e punte sempre idratate. Passa in salone per il tuo 'kit sopravvivenza' estivo!\n\n👇 Prenota qui:\n👉 https://brunomelitohair.it",
        "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"
    },
    {
        "type": "colore",
        "title": "Il Balayage che Stavi Cercando",
        "text": "Non esiste un balayage uguale all'altro. Il tuo viene dipinto a mano, centimetro per centimetro, per valorizzare la tua carnagione e il tuo taglio. 🎨\nNaturale, luminoso, TUO.\n\n💇‍♀️ Prenota la tua consulenza colore:\nhttps://brunomelitohair.it",
        "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"
    },
    {
        "type": "trattamento",
        "title": "Keratina: Addio Crespo",
        "text": "Se hai i capelli crespi, sai già quanto siano difficili da gestire ogni mattina. ⏱️😤\nIl trattamento alla keratina professionale li leviga, li nutre e li rende docili per mesi. Un'ora in salone, mesi di libertà!\n\n💇‍♀️ Prenota:\nhttps://brunomelitohair.it",
        "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"
    },
    # ... Aggiungi qui gli altri 45 post del tuo pool ...
]

DAILY_PAGE_SIZE = 5

def _daily_order(user_id: str, today_str: str) -> list[int]:
    seed = int(hashlib.md5(f"{user_id}:{today_str}".encode()).hexdigest(), 16)
    rng = random.Random(seed)
    indices = list(range(len(_POST_POOL)))
    rng.shuffle(indices)
    return indices

# ============== POST DEL GIORNO (PREIMPOSTATI) ==============

@router.get("/social/daily-suggestions")
async def get_daily_suggestions(offset: int = Query(default=0, ge=0), current_user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    user_id = current_user["id"]
    pool_size = len(_POST_POOL)
    ordered = _daily_order(user_id, today)

    start = (offset * DAILY_PAGE_SIZE) % pool_size
    raw_indices = [ordered[(start + i) % pool_size] for i in range(DAILY_PAGE_SIZE * 2)]
    
    result = []
    for rank, pool_idx in enumerate(raw_indices):
        if len(result) >= DAILY_PAGE_SIZE: break
        suggestion_id = hashlib.md5(f"{user_id}:{today}:{offset}:{rank}".encode()).hexdigest()[:16]
        saved = await db.wingman_suggestions.find_one({"id": suggestion_id, "user_id": user_id}, {"_id": 0})
        if saved and saved.get("deleted"): continue
        if saved:
            result.append({**_POST_POOL[pool_idx], **{k: v for k, v in saved.items() if k != "_id"}})
        else:
            result.append({**_POST_POOL[pool_idx], "id": suggestion_id, "daily_date": today, "offset": offset})
    return result

@router.put("/social/wingman-suggestions/{suggestion_id}")
async def update_suggestion(suggestion_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {}
    if "text" in data: update["text"] = data["text"]
    if "image_url" in data: update["image_url"] = data["image_url"]
    await db.wingman_suggestions.update_one(
        {"id": suggestion_id, "user_id": current_user["id"]},
        {"$set": {**update, "id": suggestion_id, "user_id": current_user["id"]}},
        upsert=True
    )
    return {"ok": True}

@router.delete("/social/wingman-suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.update_one(
        {"id": suggestion_id, "user_id": current_user["id"]},
        {"$set": {"deleted": True}}, upsert=True
    )
    return {"ok": True}

# ============== POST MANUALI (BOZZE) ==============

@router.post("/social/posts")
async def create_manual_post(data: dict, current_user: dict = Depends(get_current_user)):
    post_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": data.get("text", ""),
        "image_url": data.get("image_url", ""),
        "status": "draft",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_posts.insert_one(post_doc)
    return {k: v for k, v in post_doc.items() if k != "_id"}

@router.get("/social/posts")
async def get_manual_posts(current_user: dict = Depends(get_current_user)):
    return await db.social_posts.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.delete("/social/posts/{post_id}")
async def delete_manual_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.social_posts.delete_one({"id": post_id, "user_id": current_user["id"]})
    return {"ok": True}

# ============== PUBBLICAZIONE & UPLOAD ==============

@router.post("/social/publish-via-make")
async def publish_via_make(data: dict, current_user: dict = Depends(get_current_user)):
    webhook_url = current_user.get("make_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Configura il Webhook nelle Impostazioni")
    
    text = data.get("text") or ""
    image_url = data.get("image_url") or ""
    
    if not text and not image_url:
        raise HTTPException(status_code=400, detail="Post vuoto")

    payload = {
        "text": str(text),
        "message": str(text),
        "caption": str(text),
        "image_url": str(image_url)
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=15)
        if resp.status_code >= 400:
            logger.error(f"Make.com error: {resp.text}")
            raise HTTPException(status_code=500, detail=f"Make.com ha rifiutato (Codice {resp.status_code}).")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore connessione Make: {str(e)}")

    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": payload["text"],
        "image_url": payload["image_url"],
        "published_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_history.insert_one(history_doc)
    return {"success": True}

@router.post("/social/upload-image")
async def upload_social_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        import cloudinary
        import cloudinary.uploader
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
        api_key = os.environ.get("CLOUDINARY_API_KEY")
        api_secret = os.environ.get("CLOUDINARY_API_SECRET")
        if not all([cloud_name, api_key, api_secret]):
            raise HTTPException(status_code=500, detail="Cloudinary non configurato")
        
        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)
        content = await file.read()
        result = cloudinary.uploader.upload(content, resource_type="image")
        
        image_url = result.get("secure_url", "")
        fmt = result.get("format", "jpg")
        if image_url and not image_url.lower().endswith(f'.{fmt}'):
            image_url = f'{image_url}.{fmt}'
            
        return {"url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/social/config")
async def get_social_config(current_user: dict = Depends(get_current_user)):
    return {"make_webhook_url": current_user.get("make_webhook_url", ""), "configured": bool(current_user.get("make_webhook_url"))}