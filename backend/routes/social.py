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

_POST_POOL = [
    {"type": "colore", "title": "Il Balayage che Stavi Cercando", "text": "Non esiste un balayage uguale all'altro. Il tuo viene dipinto a mano, centimetro per centimetro, per valorizzare la tua carnazione. 🎨 Naturale, luminoso, TUO.\n\n💇‍♀️ Prenota la tua consulenza:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "trattamento", "title": "Keratina: Addio Crespo", "text": "Se hai i capelli crespi, sai già quanto siano difficili da gestire ogni mattina. ⏱️😤 Il trattamento alla keratina professionale li leviga, li nutre e li rende docili per mesi. Un'ora in salone, mesi di libertà!\n\n💇‍♀️ Prenota:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "taglio", "title": "Il Taglio Giusto Cambia Tutto", "text": "Un buon taglio non è solo una questione di centimetri. ✂️ È trovare la forma che valorizza il tuo viso, si adatta al tuo stile di vita e ti fa sentire te stessa ogni giorno. Vieni a raccontarci chi sei!\n\n👉 https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "motivazione", "title": "Hai Scelto Il Meglio", "text": "Non è solo un taglio o un colore. È tempo dedicato a te, lontano dallo stress. 🌸 Sappiamo che il tuo tempo è prezioso, per questo scegliamo solo i migliori prodotti professionali e le tecniche più aggiornate per te.\n\n✨ Prenota il tuo momento:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Hai Mai Provato Il Gloss?", "text": "Capelli spenti? Dagli una scarica di luce! 💎✨ Il nostro trattamento Gloss è il segreto per capelli che riflettono la luce come uno specchio. Perfetto per ridare vita al colore tra una tinta e l'altra.\n\nScoprilo qui 👇\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Osi Il Cambiamento?", "text": "Sei pronta a scoprire una versione di te che non hai mai visto? 🦋 Lascia che i nostri esperti ti guidino in un restyling completo. Taglio, colore e stile su misura per la tua personalità.\n\n🔥 Prenota la tua metamorfosi:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "fedelta", "title": "Grazie Per La Tua Fiducia", "text": "Le nostre clienti fisse lo sanno già: da noi si torna sempre volentieri! 💕 Un salone dove ti senti a casa, dove il tuo stile è conosciuto e valorizzato. Non hai ancora provato? Ti aspettiamo!\n\n✨ Unisciti a noi:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "consiglio", "title": "Lavaggio Perfetto", "text": "Lo sapevi che lavare i capelli troppo spesso li indebolisce? 🚿 I capelli producono sebo naturale che li protegge. Lavali 2-3 volte a settimana e usa un buon balsamo. Lo dice sempre il tuo hair stylist!\n\n💇‍♀️ Per consigli personalizzati:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Prova La Laminazione", "text": "Vuoi capelli più folti e lucidi senza cambiare colore? ✨ La laminazione sigilla la cuticola donando corpo e brillantezza estrema. Chiedi a noi se è adatta a te!\n\n👇 Prenota:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "motivazione", "title": "Prenditi Cura Di Te", "text": "In un mondo che corre sempre, fermarsi un'ora per se stesse non è un lusso. È una necessità. 💆‍♀️ Vieni da noi: un caffè, una chiacchierata e capelli bellissimi. Ci vediamo presto!\n\n❤️ Prenota il tuo momento:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "colore", "title": "Rame & Fuoco", "text": "Il rosso rame è il colore del momento. 🔥✨ Intensità, calore e carattere: è il colore che trasforma non solo i capelli, ma tutta la personalità. Osi il cambiamento?\n\n🍂 Prenota qui:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Shampoo Giusto?", "text": "Hai cambiato colore ma usi ancora lo shampoo di prima? 🧴 Per mantenere il colore vivo più a lungo, serve uno shampoo specifico senza solfati! Passa in salone, ti consiglieremo quello perfetto per te.\n\n👉 Prenota:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "fedelta", "title": "Il Tuo Hair Stylist Ti Conosce", "text": "Non devi spiegare ogni volta come li vuoi. 🤝 Da noi, la tua storia capellare è importante. Sappiamo esattamente cosa ti piace e come farti sentire a tuo agio. Prenota il tuo appuntamento con chi ti conosce meglio!\n\n✨ https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "consiglio", "title": "Non Dimenticare Il Termoprotettore", "text": "Piastra, arricciacapelli, phon: li usi ogni giorno ma usi il termoprotettore? 🔥 Senza protezione termica le cuticole si aprono e i capelli perdono lucentezza. Un gesto semplice che cambia tutto!\n\n✨ Vieni a scoprire i migliori prodotti:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Taglia le Punte Ogni 8 Settimane", "text": "Se vuoi far crescere i capelli, devi tagliarli. Lo so, sembra un paradosso! ✂️😄 Ma eliminare le doppie punte ogni 6-8 settimane evita che la rottura risalga lungo il fusto. Capelli che crescono sani e lunghi!\n\n📅 Prenota il tuo appuntamento:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "motivazione", "title": "Il Tuo Tempo È Prezioso", "text": "In un mondo che corre sempre, fermarsi un'ora per se stesse non è un lusso, è una necessità. 💆‍♀️ Da Bruno Melito Hair, il tuo tempo è sacro: relax, cura e stile senza compromessi. Prenota il tuo momento di puro benessere.\n\n✨ https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "consiglio", "title": "Acqua Calda o Tiepida?", "text": "Lo sapevi che l'acqua troppo calda secca il cuoio capelluto e opacizza il colore? 🚿 Prova a fare l'ultimo risciacquo con acqua tiepida-fresca: sigillerà le cuticole dei capelli donandoti una lucentezza incredibile!\n\n💡 Per altri consigli dei pro, vieni a trovarci:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Hai Mai Provato La Ricostruzione?", "text": "Troppe piastre e colorazioni? I tuoi capelli chiedono aiuto! 🆘 La nostra ricostruzione professionale ripara i legami interni del capello, riportandolo alla sua forza originaria. Dona loro una nuova vita!\n\n💪 Prenota il trattamento:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "colore", "title": "Biondo Cenere: Eleganza Pura", "text": "Il biondo cenere è la nuance più chic di sempre. 🤍 Freddo, sofisticato, elegante. Non passa mai di moda ed esalta ogni carnazion. Pronta a un cambio look di classe?\n\n✂️ Prenota la tua consulenza:\nhttps://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "L'Importanza Del Touch-Up", "text": "Il segreto di un colore sempre perfetto non è solo la tinta, ma il ritocco! 🎨 Ricrescia invisibile, colore luminoso più a lungo. Non aspettare che sbiadisca del tutto, prenota il tuo touch-up!\n\n👇 https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "consiglio", "title": "Pettini e Spazzole", "text": "Quando è stata l'ultima volta che hai pulito la tua spazzola? 🤔 Residui di prodotti e polvere si accumulano tra le setole. Lavala con acqua tiepida e shampoo una volta al mese: i tuoi capelli ti ringrazieranno!\n\n💇‍♀️ https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "trattamento", "title": "Basta Effetto Paglia", "text": "Senti i capelli ruvidi al tatto? È l'effetto paglia! 🌾 Idratazione estrema in salone per domare la secchezza e riportare morbidezza. Un trattamento rigenerante che ti farà innamorare di nuovo dei tuoi capelli.\n\n💧 https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "fedelta", "title": "Ti Ricordi Del Tuo Ultimo Taglio?", "text": "Il tempo vola! Se il tuo ultimo taglio risale a più di due mesi fa, le punte potrebbero essere indebolite. ✂️ Dai respiro ai tuoi capelli e taglia le doppie punte. Prenota il tuo ritorno in salone!\n\n📅 https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "upsell", "title": "Vuoi Più Volume?", "text": "Capelli fini e senza corpo? 🌪️ Esistono tagli sfumati e tecniche di piega che creano l'illusione di un volume incredibile. Vieni a scoprire come dare respiro alla tua chioma!\n\n✨ https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"},
    {"type": "motivazione", "title": "Cambio Stagione, Cambio Look", "text": "Ogni stagione ha il suo colore e il suo mood! 🍂 Il cambio di stagione è il momento perfetto per rinnovarsi. Vieni in salone e scegliamo insieme la nuova te per questo autunno.\n\n💇‍♀️ Prenota: https://brunomelitohair.it", "image_url": "https://res.cloudinary.com/dabpscxvz/image/upload/v1786169388/h56ayni68xzw0wodrzrt.jpg"}
]

DAILY_PAGE_SIZE = 5

def _daily_order(user_id: str, today_str: str) -> list[int]:
    seed = int(hashlib.md5(f"{user_id}:{today_str}".encode()).hexdigest(), 16)
    rng = random.Random(seed)
    indices = list(range(len(_POST_POOL)))
    rng.shuffle(indices)
    return indices

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
    if "title" in data: update["title"] = data["title"]
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

@router.post("/social/posts")
async def create_manual_post(data: dict, current_user: dict = Depends(get_current_user)):
    post_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "title": data.get("title", "Post Manuale"),
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

@router.post("/social/publish-via-make")
async def publish_via_make(data: dict, current_user: dict = Depends(get_current_user)):
    webhook_url = current_user.get("make_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Configura il Webhook nelle Impostazioni")
    
    text = data.get("text") or ""
    image_url = data.get("image_url") or ""
    
    # FIX 1: Usiamo la NUOVA immagine di default se manca
    if not image_url:
        image_url = "https://res.cloudinary.com/dabpscxvz/image/upload/v1786688048/in35khfk7f7xboczt4uy.jpg"
    
    # FIX 2: Forziamo Cloudinary a fare un crop quadrato 1:1 perfetto per Instagram
    if "res.cloudinary.com" in image_url and "/upload/" in image_url:
        parts = image_url.split("/upload/")
        if len(parts) == 2:
            image_url = parts[0] + "/upload/c_fill,w_1080,h_1080,g_auto/" + parts[1]

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

@router.api_route("/social/config", methods=["PUT", "POST"])
async def save_social_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"make_webhook_url": data.get("make_webhook_url", "")}})
    return {"ok": True}