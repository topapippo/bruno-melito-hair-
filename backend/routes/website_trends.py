from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from auth import get_current_user
from routes.public import get_public_admin_user
from database import db
import uuid
import requests
import base64
import os
import random
import hashlib
from datetime import datetime, timezone, date

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


# Pool di 14 trend — la rotazione giornaliera ne mostra 5 al giorno.
# L'admin può aggiungerne altri dal gestionale: vengono inclusi nella rotazione.
_TREND_DEFAULTS = [
    {
        "title": "Bixie Cut",
        "desc": "Il mix perfetto tra pixie e bob. Grintoso, versatile, facile da gestire ogni mattina.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png",
        "badge": "🔥 Trend",
        "color_code": "#FFD93D",
        "order": 0,
    },
    {
        "title": "Butterfly Cut",
        "desc": "Volume e movimento pazzesco senza rinunciare alle lunghezze. Perfetto per capelli medi.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png",
        "badge": "✨ Virale",
        "color_code": "#FF6B9D",
        "order": 1,
    },
    {
        "title": "Biondo Burro",
        "desc": "Luce pura e cremosa. Un biondo caldo e mai banale che illumina il viso in ogni stagione.",
        "img": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg",
        "badge": "☀️ Estate",
        "color_code": "#A8DAFF",
        "order": 2,
    },
    {
        "title": "Curtain Bangs",
        "desc": "La frangia a tendina aperta al centro. Addolcisce i tratti e si adatta a qualsiasi lunghezza.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png",
        "badge": "💫 Must Have",
        "color_code": "#C3F0CA",
        "order": 3,
    },
    {
        "title": "Lob — Long Bob",
        "desc": "Il taglio medio per eccellenza. Pratico, elegante, si porta liscio o mosso con lo stesso risultato.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/23ccfe5aaadde1f4925524c2bf4de0408eb95858d844b45025838d9959197b1f.png",
        "badge": "✂️ Classico",
        "color_code": "#FFB347",
        "order": 4,
    },
    {
        "title": "Shag Cut",
        "desc": "Strati scalati, texture naturale e quel fascino rock anni '70 reinterpretato in chiave moderna.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/04492e144007b03d47cea802da126e127774cff08c2b44b6919c6640989d519a.png",
        "badge": "🎸 Rock Chic",
        "color_code": "#FF6B9D",
        "order": 5,
    },
    {
        "title": "Balayage Caramello",
        "desc": "Sfumature dipinte a mano sui capelli castani. Naturale come se il sole le avesse create lui stesso.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png",
        "badge": "🎨 Colore",
        "color_code": "#FFD93D",
        "order": 6,
    },
    {
        "title": "Copper Red",
        "desc": "Il rosso rame bruciato domina la stagione. Intenso, caldo, impossibile da ignorare.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png",
        "badge": "🔥 Fuoco",
        "color_code": "#FF6B35",
        "order": 7,
    },
    {
        "title": "Biondo Cenere",
        "desc": "Freddo, sofisticato, nordico. Il biondo cenere è l'opposto del biondo caldo e funziona su tutti.",
        "img": "https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg",
        "badge": "🌫️ Nordic",
        "color_code": "#A8DAFF",
        "order": 8,
    },
    {
        "title": "Beach Waves",
        "desc": "L'effetto onde da spiaggia che dura. Movimento naturale senza il danno del salmastro.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/572ec519daddcad1f4a85c012592ce7cb5567c2466fd73ce966377d55a547053.png",
        "badge": "🌊 Estate",
        "color_code": "#A8DAFF",
        "order": 9,
    },
    {
        "title": "Effetto Gloss",
        "desc": "Capelli che riflettono la luce come uno specchio. Il trattamento gloss fa risplendere qualsiasi colore.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/caa3730f2b773f851f0f25819099c95113062e0f7ba5894fc18924330fbaf81e.png",
        "badge": "💎 Glam",
        "color_code": "#C3F0CA",
        "order": 10,
    },
    {
        "title": "Castano Cioccolato",
        "desc": "Profondo, caldo, irresistibile. Il castano cioccolato è senza tempo e luminoso in ogni stagione.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png",
        "badge": "🍫 Caldo",
        "color_code": "#8B5E3C",
        "order": 11,
    },
    {
        "title": "Air-Light Cut",
        "desc": "Il taglio che toglie peso senza svuotare. Capelli leggeri, voluminosi e sempre in movimento.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png",
        "badge": "🌬️ Volume",
        "color_code": "#C3F0CA",
        "order": 12,
    },
    {
        "title": "Highlights Naturali",
        "desc": "Colpi di luce messi a mano sulle lunghezze. Effetto sole tutto l'anno, senza danni.",
        "img": "https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/28527e09a63e933c1a6707ec114afd3802828c9fdd7930a980697e2abe154cba.png",
        "badge": "✨ Luce",
        "color_code": "#FFD93D",
        "order": 13,
    },
]

DAILY_COUNT = 5  # quanti trend mostrare ogni giorno


def _daily_trend_ids(all_ids: list[str], today_str: str) -> list[str]:
    """Restituisce DAILY_COUNT ID in ordine deterministico basato sulla data."""
    seed = int(hashlib.md5(today_str.encode()).hexdigest(), 16)
    rng = random.Random(seed)
    shuffled = list(all_ids)
    rng.shuffle(shuffled)
    return shuffled[:DAILY_COUNT]


async def _ensure_defaults(user_id: str):
    """Inserisce i default mancanti (confronto per titolo — idempotente)."""
    existing = await db.website_trends.find({"user_id": user_id}, {"title": 1}).to_list(100)
    existing_titles = {d["title"] for d in existing}
    missing = [d for d in _TREND_DEFAULTS if d["title"] not in existing_titles]
    if not missing:
        return
    to_insert = [
        {**d, "id": str(uuid.uuid4()), "user_id": user_id,
         "created_at": datetime.now(timezone.utc).isoformat()}
        for d in missing
    ]
    await db.website_trends.insert_many(to_insert)


@router.get("/website-trends")
async def get_trends(current_user: dict = Depends(get_current_user)):
    await _ensure_defaults(current_user["id"])
    trends = await db.website_trends.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("order", 1).to_list(50)
    return trends


@router.get("/website-trends/daily")
async def get_trends_daily():
    """Endpoint pubblico — restituisce 5 trend ruotati automaticamente ogni giorno."""
    today = date.today().isoformat()

    admin_user = await get_public_admin_user()
    uid_filter = {"user_id": admin_user["id"]} if admin_user else {}
    all_trends = await db.website_trends.find(uid_filter, {"_id": 0}).sort("order", 1).to_list(50)

    if not all_trends:
        # Nessun trend nel DB: usa i default hardcoded direttamente
        return _TREND_DEFAULTS[:DAILY_COUNT]

    all_ids = [t["id"] for t in all_trends]
    daily_ids = set(_daily_trend_ids(all_ids, today))
    result = [t for t in all_trends if t["id"] in daily_ids]

    # Mantieni l'ordine deterministico della rotazione
    ordered_ids = _daily_trend_ids(all_ids, today)
    id_map = {t["id"]: t for t in result}
    return [id_map[i] for i in ordered_ids if i in id_map]


@router.get("/website-trends/public")
async def get_trends_public():
    """Endpoint pubblico — restituisce tutti i trend (usato dall'admin per anteprima)."""
    admin_user = await get_public_admin_user()
    uid_filter = {"user_id": admin_user["id"]} if admin_user else {}
    trends = await db.website_trends.find(uid_filter, {"_id": 0}).sort("order", 1).to_list(50)
    if not trends:
        return _TREND_DEFAULTS
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
