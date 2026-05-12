from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
        {"$set": {
            "make_webhook_url": data.get("make_webhook_url", ""),
        }}
    )
    return {"ok": True}


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


@router.post("/social/generate-text")
async def generate_post_text(data: dict, current_user: dict = Depends(get_current_user)):
    topic = data.get("topic", "promozione")
    salon_name = current_user.get("salon_name", "il salone")
    return {"text": _generate_text(topic, salon_name)}


@router.post("/social/upload-image")
async def upload_social_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Il file deve essere un'immagine")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    os.makedirs(MEDIA_DIR, exist_ok=True)
    path = os.path.join(MEDIA_DIR, filename)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 10 MB)")
    with open(path, "wb") as f:
        f.write(content)
    url = f"{BACKEND_URL}/api/social/media/{filename}"
    return {"url": url, "filename": filename}


@router.get("/social/media/{filename}")
async def serve_social_media(filename: str):
    if not re.match(r'^[a-f0-9\-]{36}\.(jpg|jpeg|png|gif|webp)$', filename):
        raise HTTPException(status_code=400, detail="Filename non valido")
    path = os.path.join(MEDIA_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(path)


def _publish_to_facebook(page_id: str, token: str, message: str, image_url) -> dict:
    try:
        if image_url:
            resp = requests.post(
                f"https://graph.facebook.com/v19.0/{page_id}/photos",
                data={"url": image_url, "caption": message, "access_token": token},
                timeout=30,
            )
        else:
            resp = requests.post(
                f"https://graph.facebook.com/v19.0/{page_id}/feed",
                data={"message": message, "access_token": token},
                timeout=30,
            )
        data = resp.json()
        if resp.status_code == 200 and "id" in data:
            return {"success": True, "post_id": data["id"]}
        err = data.get("error", {}).get("message", "Errore sconosciuto")
        return {"success": False, "error": err}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _publish_to_instagram(ig_user_id: str, token: str, message: str, image_url: str) -> dict:
    try:
        create = requests.post(
            f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
            data={"image_url": image_url, "caption": message, "access_token": token},
            timeout=30,
        )
        cdata = create.json()
        if create.status_code != 200 or "id" not in cdata:
            err = cdata.get("error", {}).get("message", "Errore creazione media")
            return {"success": False, "error": err}
        pub = requests.post(
            f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish",
            data={"creation_id": cdata["id"], "access_token": token},
            timeout=30,
        )
        pdata = pub.json()
        if pub.status_code == 200 and "id" in pdata:
            return {"success": True, "post_id": pdata["id"]}
        err = pdata.get("error", {}).get("message", "Errore pubblicazione")
        return {"success": False, "error": err}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/social/publish")
async def publish_post(data: dict, current_user: dict = Depends(get_current_user)):
    page_id = current_user.get("fb_page_id", "")
    token = current_user.get("fb_page_token", "")
    ig_user_id = current_user.get("ig_user_id", "")

    if not page_id or not token:
        raise HTTPException(status_code=400, detail="Configura prima le credenziali Facebook nelle Impostazioni")

    message = data.get("message", "").strip()
    image_url = data.get("image_url") or None

    if not message:
        raise HTTPException(status_code=400, detail="Il testo del post non può essere vuoto")

    import asyncio
    loop = asyncio.get_event_loop()

    fb_result = await loop.run_in_executor(None, _publish_to_facebook, page_id, token, message, image_url)

    ig_result = None
    if ig_user_id and image_url:
        ig_result = await loop.run_in_executor(None, _publish_to_instagram, ig_user_id, token, message, image_url)
    elif ig_user_id and not image_url:
        ig_result = {"success": False, "error": "Instagram richiede un'immagine per pubblicare"}

    results = {"facebook": fb_result}
    if ig_result is not None:
        results["instagram"] = ig_result

    await db.social_posts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "message": message,
        "image_url": image_url,
        "results": results,
        "published_at": datetime.now(timezone.utc).isoformat(),
    })

    return results


@router.get("/social/posts")
async def get_social_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.social_posts.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("published_at", -1).to_list(30)
    return posts
