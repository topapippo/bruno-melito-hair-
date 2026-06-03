from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from auth import get_current_user
from database import db
import requests
import os
import uuid
import re
import random
import base64
import io
from PIL import Image
from datetime import datetime, timezone

router = APIRouter()

IMGBB_API_KEY = os.environ.get("IMGBB_API_KEY")

_WINGMAN_DEFAULTS = [
    {
        "type": "weekend",
        "title": "Posti Volanti!",
        "text": "Chi dorme non piglia... il look perfetto! ✂️✨\nDomani è sabato e abbiamo gli ultimissimi posti disponibili per trasformare i tuoi capelli in un capolavoro. \n\nNon aspettare lunedì per sentirti bellissima. Prenota ora l'ultimo posto rimasto! 👇\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    {
        "type": "divertente",
        "title": "Il Momento di Gloria",
        "text": "La vita non è perfetta, ma i tuoi capelli possono esserlo. (Specialmente se passi da noi 😉). Prenota il tuo momento di gloria su https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png",
    },
    {
        "type": "divertente",
        "title": "Effetto Psicologo",
        "text": "Cambiare taglio costa meno di una seduta dallo psicologo e l'effetto è molto più immediato. Provare per credere! 💆‍♀️✨ Scopri i nostri servizi su https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png",
    },
    {
        "type": "diva",
        "title": "La tua Corona",
        "text": "I capelli sono la corona che non ti togli mai. Assicurati che splenda come merita! ✨👑 Passa a trovarci o prenota online su https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png",
    },
    {
        "type": "divertente",
        "title": "Grida AIUTO?",
        "text": "Se i tuoi capelli gridano 'AIUTO', Bruno Melito risponde 'ARRIVO!'. ✂️ Smetti di litigare con la spazzola e vieni a farti coccolare. 👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png",
    },
    {
        "type": "diva",
        "title": "Scatena l'Invidia",
        "text": "Il tuo ex ti ha vista e ha sospirato? No, è solo il tuo nuovo colore firmato Bruno Melito. Scatena l'invidia, clicca qui: https://brunomelitohair.it",
        "image_url": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg",
    },
    {
        "type": "curiosità",
        "title": "Sogni a un Click",
        "text": "I capelli dei tuoi sogni sono a un click di distanza. Non mordono, promesso! 😉 Guarda i nostri ultimi lavori su https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png",
    },
    {
        "type": "stagionale",
        "title": "SOS Mare",
        "text": "Il mare rovina i capelli? Solo se non conosci i segreti di Bruno Melito. Scopri i trattamenti 'salva-chioma' prima di infilare il costume! 🌊 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png",
    }
]

@router.get("/social/wingman-suggestions")
async def get_wingman_suggestions(current_user: dict = Depends(get_current_user)):
    suggestions = await db.wingman_suggestions.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(10)
    if not suggestions:
        to_insert = [{**d, "id": str(uuid.uuid4()), "user_id": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()} for d in _WINGMAN_DEFAULTS]
        await db.wingman_suggestions.insert_many(to_insert)
        suggestions = to_insert
    for s in suggestions: s.pop("_id", None)
    return suggestions

@router.post("/social/refresh-suggestions")
async def refresh_suggestions(current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.delete_many({"user_id": current_user["id"]})
    to_insert = [{**d, "id": str(uuid.uuid4()), "user_id": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()} for d in _WINGMAN_DEFAULTS]
    random.shuffle(to_insert)
    selected = to_insert[:6]
    await db.wingman_suggestions.insert_many(selected)
    for s in selected: s.pop("_id", None)
    return selected

@router.put("/social/wingman-suggestions/{suggestion_id}")
async def update_suggestion(suggestion_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.update_one({"id": suggestion_id, "user_id": current_user["id"]}, {"$set": data})
    return {"ok": True}

@router.delete("/social/wingman-suggestions/{suggestion_id}")
async def delete_suggestion(suggestion_id: str, current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.delete_one({"id": suggestion_id, "user_id": current_user["id"]})
    return {"ok": True}

@router.get("/social/config")
async def get_config(current_user: dict = Depends(get_current_user)):
    return {"make_webhook_url": current_user.get("make_webhook_url", ""), "configured": bool(current_user.get("make_webhook_url"))}

@router.put("/social/config")
async def save_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"make_webhook_url": data.get("make_webhook_url", "")}})
    return {"ok": True}

@router.post("/social/publish-via-make")
async def publish_via_make(data: dict, current_user: dict = Depends(get_current_user)):
    url = current_user.get("make_webhook_url")
    if not url: raise HTTPException(status_code=400, detail="Configura il Webhook")
    
    # Invia a Make.com
    try:
        requests.post(url, json=data, timeout=10)
    except Exception as e:
        logger.error(f"Errore invio a Make.com: {e}")
        raise HTTPException(status_code=500, detail="Errore nell'invio ai social")

    # Salva nello storico
    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": data.get("text") or data.get("message", ""),
        "image_url": data.get("image_url", ""),
        "published_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_history.insert_one(history_doc)
    
    return {"success": True}

@router.get("/social/history")
async def get_social_history(current_user: dict = Depends(get_current_user)):
    history = await db.social_history.find({"user_id": current_user["id"]}, {"_id": 0}).sort("published_at", -1).to_list(20)
    return history

@router.post("/social/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not IMGBB_API_KEY:
        raise HTTPException(status_code=500, detail="ImgBB API Key non configurata sul server (Render)")
    
    try:
        contents = await file.read()
        # Elaborazione immagine con Pillow per renderla quadrata (1:1)
        img = Image.open(io.BytesIO(contents))
        
        width, height = img.size
        new_side = min(width, height)
        left = (width - new_side) / 2
        top = (height - new_side) / 2
        right = (width + new_side) / 2
        bottom = (height + new_side) / 2
        
        img = img.crop((left, top, right, bottom))
        img = img.resize((1080, 1080), Image.Resampling.LANCZOS)
        
        # Converti di nuovo in byte
        img_byte_arr = io.BytesIO()
        # Salva in formato originale o JPEG come fallback
        format_to_save = img.format if img.format else "JPEG"
        img.save(img_byte_arr, format=format_to_save)
        final_contents = img_byte_arr.getvalue()
        
        encoded_image = base64.b64encode(final_contents).decode("utf-8")
        
        resp = requests.post(
            "https://api.imgbb.com/1/upload",
            data={
                "key": IMGBB_API_KEY,
                "image": encoded_image
            },
            timeout=30
        )
        data = resp.json()
        
        if not data.get("success"):
            raise Exception(data.get("error", {}).get("message", "Upload fallito"))
            
        return {"url": data["data"]["url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore caricamento immagine: {str(e)}")
