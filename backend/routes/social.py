from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from auth import get_current_user
from database import db
import requests
import os
import uuid
import re
import random
from datetime import datetime, timezone

router = APIRouter()

BACKEND_URL = os.environ.get("BACKEND_URL", "https://brunomelitoapi.onrender.com")
MEDIA_DIR = "/tmp/social_media"

_CLD_URL = os.environ.get("CLOUDINARY_URL", "")

if _CLD_URL:
    import cloudinary
    cloudinary.config(url=_CLD_URL)

_CLD_CLOUD = bool(_CLD_URL)


def _upload_to_cloudinary(content: bytes) -> str:
    import cloudinary.uploader
    import base64
    b64 = base64.b64encode(content).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64}"
    result = cloudinary.uploader.upload(data_uri, folder="bruno-melito-social", resource_type="image")
    return result["secure_url"]


_TEMPLATES = {
    "promozione": [
        "🌟 OFFERTA SPECIALE! Prenota entro questo weekend e ottieni uno sconto esclusivo sul tuo prossimo trattamento. Non perdere questa occasione! 📲 Prenota ora sul nostro sito.",
        "✂️ Questa settimana da {salon} ti aspetta un'offerta imperdibile! Chiama o prenota online per scoprirla. Ti aspettiamo!",
        "💇‍♀️ Vuoi rinnovare il tuo look? Da {salon} abbiamo la soluzione perfetta per te. Prenota il tuo appuntamento oggi stesso!",
    ],
    "servizio": [
        "✨ Hai mai provato il nostro trattamento di colorazione? Da {salon} utilizziamo solo prodotti di alta qualità per un colore luminoso e duraturo. Prenota la tua consulenza gratuita!",
        "💆‍♀️ Prenditi cura dei tuoi capelli con il nostro trattamento nutriente. Da {salon} ogni cliente riceve un'attenzione personalizzata. Vieni a trovarci!",
        "✂️ Il taglio perfetto per ogni forma di viso. Il team di {salon} è qui per valorizzarti al meglio. Prenota il tuo appuntamento!",
    ],
    "stagionale": [
        "🌸 Primavera è arrivata! È il momento perfetto per rinnovare il tuo look. Da {salon} ti aspettiamo con tante novità stagionali!",
        "☀️ Estate si avvicina! Proteggi e valorizza i tuoi capelli con i nostri trattamenti estivi. Prenota ora da {salon}!",
        "🍂 Autunno è il momento ideale per un cambio di look. Da {salon} ti aiutiamo a trovare il colore e il taglio perfetto per questa stagione.",
        "❄️ Un nuovo anno, un nuovo look! Inizia il 2025 con un'acconciatura che ti faccia sentire al top. Ti aspettiamo da {salon}!",
    ],
    "auguri": [
        "🎄 Da tutto il team di {salon} vi auguriamo Buone Feste! Che questo periodo sia ricco di gioia e spensieratezza. ❤️",
        "🎉 Buona Pasqua da {salon}! Vi auguriamo una giornata serena in compagnia delle persone care. 🐣",
        "🌸 Buona Festa della Mamma! Da {salon} celebriamo tutte le mamme meravigliose. Un pensiero speciale per loro oggi! ❤️",
        "☀️ Buona estate da tutto il team di {salon}! Ci vediamo dopo le vacanze con tante novità!",
    ],
    "curiosita": [
        "💡 Lo sapevi? Tagliare le punte regolarmente ogni 6-8 settimane aiuta i capelli a crescere più sani e forti. Il team di {salon} è sempre a tua disposizione! ✂️",
        "💧 Idratazione è la chiave per capelli sani! Usa una maschera nutriente almeno una volta a settimana. Da {salon} ti consigliamo il prodotto giusto per il tuo tipo di capello.",
        "🌿 Sapevi che i capelli crescono in media 1-1,5 cm al mese? Con le cure giuste da {salon} possiamo aiutarti a mantenerli sempre in perfetta forma!",
    ],
}


def _generate_text(topic: str, salon_name: str) -> str:
    templates = _TEMPLATES.get(topic, _TEMPLATES["promozione"])
    text = random.choice(templates)
    return text.replace("{salon}", salon_name)


# ── Config (webhook manuale) ───────────────────────────────────────────────────

@router.get("/social/config")
async def get_social_config(current_user: dict = Depends(get_current_user)):
    make_url = current_user.get("make_webhook_url", "")
    return {
        "make_webhook_url": make_url,
        "configured": bool(make_url),
    }


@router.put("/social/config")
async def save_social_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"make_webhook_url": data.get("make_webhook_url", "")}}
    )
    return {"ok": True}


# ── Pubblica manualmente via Make.com ─────────────────────────────────────────

@router.post("/social/publish-via-make")
async def publish_via_make(data: dict, current_user: dict = Depends(get_current_user)):
    webhook_url = current_user.get("make_webhook_url", "")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Configura prima il webhook Make.com nelle Impostazioni")

    message = data.get("message", "").strip()
    image_url = data.get("image_url") or None
    platforms = data.get("platforms", ["facebook", "instagram"])

    if not message:
        raise HTTPException(status_code=400, detail="Il testo del post non può essere vuoto")

    payload = {"text": message, "image_url": image_url, "platforms": platforms}

    import asyncio
    def _call_make():
        return requests.post(webhook_url, json=payload, timeout=30)

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _call_make)

    if resp.status_code not in (200, 201, 204):
        raise HTTPException(status_code=502, detail=f"Make.com ha risposto con errore: {resp.status_code}")

    await db.social_posts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "message": message,
        "image_url": image_url,
        "platforms": platforms,
        "results": {"make": {"success": True}},
        "published_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True}


# ── Genera testo ───────────────────────────────────────────────────────────────

@router.post("/social/generate-text")
async def generate_post_text(data: dict, current_user: dict = Depends(get_current_user)):
    topic = data.get("topic", "promozione")
    salon_name = current_user.get("salon_name", "il salone")
    return {"text": _generate_text(topic, salon_name)}


# ── Upload immagine (Cloudinary) ───────────────────────────────────────────────

@router.post("/social/upload-image")
async def upload_social_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 10 MB)")

    if _CLD_CLOUD:
        try:
            url = _upload_to_cloudinary(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Errore Cloudinary: {str(e)}")
    else:
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
            ext = "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        os.makedirs(MEDIA_DIR, exist_ok=True)
        path = os.path.join(MEDIA_DIR, filename)
        with open(path, "wb") as f:
            f.write(content)
        url = f"{BACKEND_URL}/api/social/media/{filename}"

    return {"url": url}


# ── Libreria immagini ──────────────────────────────────────────────────────────

@router.get("/social/library")
async def get_image_library(current_user: dict = Depends(get_current_user)):
    images = await db.social_library.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("uploaded_at", -1).to_list(100)
    return images


@router.post("/social/library/upload")
async def upload_library_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 10 MB)")

    if not _CLD_CLOUD:
        raise HTTPException(status_code=500, detail="Cloudinary non configurato sul server")

    try:
        url = _upload_to_cloudinary(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore Cloudinary: {str(e)}")

    image_id = str(uuid.uuid4())

    await db.social_library.insert_one({
        "id": image_id,
        "user_id": current_user["id"],
        "url": url,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"id": image_id, "url": url}


@router.delete("/social/library/{image_id}")
async def delete_library_image(image_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.social_library.delete_one({"id": image_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Immagine non trovata")
    return {"ok": True}


# ── API Key per Make.com (auto-generate) ───────────────────────────────────────

@router.get("/social/api-key")
async def get_social_api_key(current_user: dict = Depends(get_current_user)):
    key = current_user.get("social_api_key", "")
    if not key:
        key = str(uuid.uuid4()).replace("-", "")
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"social_api_key": key}})
    return {"api_key": key}


# ── Auto-generate (chiamato da Make.com Schedule) ─────────────────────────────

@router.get("/social/auto-generate")
async def auto_generate(api_key: str = Query(...)):
    user = await db.users.find_one({"social_api_key": api_key}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="API key non valida")

    salon_name = user.get("salon_name", "il salone")
    topic = random.choice(list(_TEMPLATES.keys()))
    text = _generate_text(topic, salon_name)

    images = await db.social_library.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    image_url = random.choice(images)["url"] if images else None

    await db.social_posts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "message": text,
        "image_url": image_url,
        "platforms": ["facebook", "instagram"] if image_url else ["facebook"],
        "results": {"auto": {"generated": True}},
        "published_at": datetime.now(timezone.utc).isoformat(),
        "auto": True,
    })

    return {"text": text, "image_url": image_url, "topic": topic}


# ── Serve media (fallback locale) ─────────────────────────────────────────────

@router.get("/social/media/{filename}")
async def serve_social_media(filename: str):
    if not re.match(r'^[a-f0-9\-]{36}\.(jpg|jpeg|png|gif|webp)$', filename):
        raise HTTPException(status_code=400, detail="Filename non valido")
    path = os.path.join(MEDIA_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(path)


# ── Storico post ───────────────────────────────────────────────────────────────

@router.get("/social/posts")
async def get_social_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.social_posts.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("published_at", -1).to_list(30)
    return posts
