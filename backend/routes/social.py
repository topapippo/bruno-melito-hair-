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
        "type": "estate",
        "title": "S.O.S. Sole & Salsedine",
        "text": "Il sole bacia i belli... ma mette a dura prova i capelli! ☀️🌊\nNon farti trovare impreparata: scopri i nostri trattamenti protettivi per un biondo che non vira e punte sempre idratate. Passa in salone per il tuo 'kit sopravvivenza' estivo! \n\n👇 Prenota la tua consulenza qui:\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png"
    },
    {
        "type": "matrimoni",
        "title": "Invitata Perfetta",
        "text": "Hai già l'abito ma non sai cosa fare con i capelli? 👗✨\nChe sia un raccolto morbido o un'onda glamour, siamo qui per renderti l'invitata più ammirata. Giugno è il mese dei matrimoni, prenota il tuo posto in tempo! \n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    },
    {
        "type": "divertente",
        "title": "Domenica da Diva",
        "text": "Il lunedì è lontano, ma la bellezza è a un click di distanza. ✨\nNon aspettare che i tuoi capelli gridino 'aiuto'. Regalati un sabato di relax e stile da Bruno Melito. Uscirai dal salone pronta a conquistarom il mondo (o almeno l'aperitivo! 😉).\n\n👉 Prenota ora: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png"
    },
    {
        "type": "stile",
        "title": "Effetto Gloss 2026",
        "text": "Capelli spenti? Dagli una scarica di luce! 💎✨\nIl nostro trattamento Gloss è il segreto delle star per capelli che riflettono la luce come uno specchio. Perfetto per ridare vita al colore tra una tinta e l'altra. \n\nScoprilo qui 👇\nhttps://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png"
    },
    {
        "type": "weekend",
        "title": "Posti 'Last Minute'",
        "text": "Sei stata fortunata! ✨\nSi è appena liberato un posto per domani mattina. Chi lo prende? Se vuoi un cambio look dell'ultimo minuto, questa è la tua occasione. Corri a prenotare! 👇\n\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png"
    },
    {
        "type": "cambiamento",
        "title": "Bixie o Butterfly?",
        "text": "Corto e grintoso o lungo e voluminoso? ✂️🦋\nLe tendenze dell'estate 2026 sono qui. Se sei indecisa, ti aiutiamo noi a trovare la forma perfetta per il tuo viso. Il cambiamento inizia dalla testa!\n\n👉 Guarda i nostri lavori: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png"
    },
    {
        "type": "cura",
        "title": "Clean Beauty",
        "text": "La tua bellezza non ha bisogno di chimica aggressiva. 🌿✨\nUsiamo solo prodotti senza parabeni e solfati, per capelli sani che splendono di salute naturale. Perché amiamo te e amiamo la natura. \n\nScegli il meglio: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/99d308789e991a555a550483448efdcd7610cd3547dbb1e5041e2caf94ec39b8.png"
    },
    {
        "type": "biondo",
        "title": "Biondo Burro",
        "text": "La nuance più calda e desiderata di questa estate. 🧈✨\nUn biondo cremoso, luminoso e mai banale. Vieni a scoprire come lo realizziamo con le nostre tecniche di schiaritura dolce. \n\nTi aspettiamo! 👇\nhttps://brunomelitohair.it",
        "image_url": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg"
    },
    {
        "type": "tendenza",
        "title": "Volume & Light",
        "text": "Sogni capelli voluminosi che catturano ogni raggio di sole? ✨\nLa nostra tecnica di taglio 'Air-Light' dona leggerezza e movimento senza svuotare le punte. Il segreto per un'estate a tutto volume!\n\n👇 Prenota qui:\n👉 https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png"
    },
    {
        "type": "relax",
        "title": "Rituale Detox",
        "text": "Senti i capelli pesanti? È ora di un reset! 💆‍♀️🌿\nIl nostro trattamento Detox purifica la cute e idrata le lunghezze, eliminando residui di smog e prodotti. Un momento di puro relax per te e la tua chioma.\n\n✨ Regalati una pausa: https://brunomelitohair.it",
        "image_url": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png"
    }
]

@router.get("/social/wingman-suggestions")
async def get_wingman_suggestions(current_user: dict = Depends(get_current_user)):
    suggestions = await db.wingman_suggestions.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(30)
    if not suggestions:
        to_insert = [{**d, "id": str(uuid.uuid4()), "user_id": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()} for d in _WINGMAN_DEFAULTS]
        await db.wingman_suggestions.insert_many(to_insert)
        suggestions = to_insert
    for s in suggestions: s.pop("_id", None)
    return suggestions

@router.post("/social/refresh-suggestions")
async def refresh_suggestions(current_user: dict = Depends(get_current_user)):
    await db.wingman_suggestions.delete_many({"user_id": current_user["id"]})
    pool = list(_WINGMAN_DEFAULTS)
    random.shuffle(pool)
    to_insert = [{**d, "id": str(uuid.uuid4()), "user_id": current_user["id"], "created_at": datetime.now(timezone.utc).isoformat()} for d in pool]
    await db.wingman_suggestions.insert_many(to_insert)
    for s in to_insert: s.pop("_id", None)
    return to_insert

@router.put("/social/wingman-suggestions/{suggestion_id}")
async def update_suggestion(suggestion_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    # Assicuriamoci di mappare correttamente 'text'
    update = {}
    if "text" in data: update["text"] = data["text"]
    if "image_url" in data: update["image_url"] = data["image_url"]
    if "title" in data: update["title"] = data["title"]
    
    await db.wingman_suggestions.update_one({"id": suggestion_id, "user_id": current_user["id"]}, {"$set": update})
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
    
    # Invia payload ridondante per garantire che Make.com riceva il testo
    # Aggiungiamo 'message' e 'caption' come fallback di 'text'
    payload = {
        **data,
        "text": data.get("text") or data.get("message", ""),
        "message": data.get("text") or data.get("message", ""),
        "caption": data.get("text") or data.get("message", ""),
    }
    
    try:
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        logger.error(f"Errore invio a Make.com: {e}")
        raise HTTPException(status_code=500, detail="Errore nell'invio ai social")

    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "text": payload["text"],
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
        img = Image.open(io.BytesIO(contents))
        
        width, height = img.size
        new_side = min(width, height)
        left = (width - new_side) / 2
        top = (height - new_side) / 2
        right = (width + new_side) / 2
        bottom = (height + new_side) / 2
        
        img = img.crop((left, top, right, bottom))
        img = img.resize((1080, 1080), Image.Resampling.LANCZOS)
        
        img_byte_arr = io.BytesIO()
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
