from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, BackgroundTasks
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import re
import base64
import requests as http_requests
import logging
import asyncio

from slowapi import Limiter
from slowapi.util import get_remote_address

from database import db
from auth import get_current_user
from models import PublicBookingRequest, get_loyalty_rewards, LOYALTY_POINTS_PER_EURO
from utils import normalize_phone_wa, send_whatsapp, calculate_end_time, send_automatic_message, resolve_client
from cache_utils import invalidate_website_cache, get_cached_website, set_cached_website
from database import fs, sync_db
from fastapi.responses import StreamingResponse, Response
from fastapi.concurrency import run_in_threadpool
from bson import ObjectId
import gridfs
import base64

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "admin@brunomelito.it")
APP_NAME = "mbhssalon"

# Cartella legacy per i vecchissimi upload su disco (local://). Lo storage attuale
# è GridFS; questa resta solo per leggere file vecchi.
try:
    LOCAL_UPLOAD_DIR = "/app/backend/uploads"
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
except Exception:
    LOCAL_UPLOAD_DIR = "/tmp/uploads"
    try:
        os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
    except Exception:
        pass


# ============== STORAGE FILE (GridFS) ==============

def _file_id_from_path(path: str) -> str:
    """Estrae il file_id (UUID) da un path qualsiasi: gridfs://, mongo://, local://
    o vecchi path remoti tipo 'mbhssalon/uploads/<id>.<ext>'."""
    filename = path.split("/")[-1]
    return filename.rsplit(".", 1)[0]


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Salva il file in GridFS (MongoDB). GridFS spezzetta i file in chunk, quindi
    NON c'è il limite di 16MB del singolo documento BSON: foto e video di qualsiasi
    dimensione vengono salvati e sopravvivono ai redeploy di Render."""
    file_id = _file_id_from_path(path)
    # Rimuovi eventuali versioni precedenti con lo stesso id (re-upload)
    for old in fs.find({"filename": file_id}):
        fs.delete(old._id)
    fs.put(data, filename=file_id, content_type=content_type)
    return {"path": f"gridfs://{file_id}", "size": len(data)}


def get_object(path: str):
    file_id = _file_id_from_path(path)

    # 1) GridFS — storage principale attuale (foto e video di qualsiasi dimensione)
    gf = fs.find_one({"filename": file_id})
    if gf is not None:
        return gf.read(), (gf.content_type or "application/octet-stream")

    # 2) Legacy: base64 inline nel documento website_files (foto piccole pre-GridFS)
    record = sync_db.website_files.find_one({"id": file_id})
    if record and record.get("file_data"):
        data = base64.b64decode(record["file_data"])
        return data, record.get("content_type", "application/octet-stream")

    # 3) Legacy: file su disco locale (vecchi path local://)
    if path.startswith("local://"):
        filename = path.replace("local://", "")
        local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                data = f.read()
            ext = filename.split(".")[-1].lower()
            mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
            return data, mime_map.get(ext, "application/octet-stream")

    raise HTTPException(status_code=404, detail="File non trovato")


# Dimensione massima di un singolo chunk per le richieste Range "aperte" (es. "bytes=0-").
# Restituendo ~1MB alla volta i video partono subito su mobile e il browser chiede il resto
# man mano, invece di scaricare tutto in un colpo.
_RANGE_CHUNK = 1024 * 1024  # 1 MB


def read_grid_range(path: str, range_header: str):
    """Legge SOLO l'intervallo di byte richiesto direttamente da GridFS (seek + read),
    senza caricare l'intero file in memoria. Ritorna (chunk, start, end, total) oppure None
    se il file non è su GridFS o il range non è valido."""
    file_id = _file_id_from_path(path)
    gf = fs.find_one({"filename": file_id})
    if gf is None:
        return None
    total = gf.length
    try:
        range_val = range_header.replace("bytes=", "").strip()
        start_str, _, end_str = range_val.partition("-")
        start = int(start_str) if start_str else 0
        if end_str.strip():
            end = int(end_str)
        else:
            end = min(start + _RANGE_CHUNK - 1, total - 1)
    except Exception:
        return None
    end = min(end, total - 1)
    if start < 0 or start > end or start >= total:
        return None
    gf.seek(start)
    chunk = gf.read(end - start + 1)
    return chunk, start, end, total


def open_grid(path: str):
    """Ritorna il GridOut (handle al file su GridFS) senza leggerlo in memoria, oppure None."""
    return fs.find_one({"filename": _file_id_from_path(path)})


def _stream_grid(gf, chunk_size: int = 256 * 1024):
    """Generatore che legge il file da GridFS a blocchi (256KB) — non carica mai
    l'intero file in RAM (evita l'OOM su Render con video grandi)."""
    try:
        while True:
            data = gf.read(chunk_size)
            if not data:
                break
            yield data
    finally:
        try:
            gf.close()
        except Exception:
            pass


@router.get("/ping")
async def ping(): return {"ok": True}

@router.get("/warmup")
async def warmup(background_tasks: BackgroundTasks):
    background_tasks.add_task(public_get_website)
    return {"ok": True}

async def get_public_admin_user():
    # NB: serve il documento utente COMPLETO (escluso _id e password), non solo "id":
    # le notifiche WhatsApp di prenotazione usano ultramsg_*/green_api_* presi da qui.
    # Con la vecchia projection {"id": 1} quei campi mancavano e l'invio falliva muto.
    proj = {"_id": 0, "password": 0}
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, proj)
    if not user:
        user = await db.users.find_one({}, proj)
    return user

DEFAULT_WEBSITE_CONFIG = {
    "salon_name": "BRUNO MELITO HAIR",
    "slogan": "Metti la testa a posto!!",
    "subtitle": "SOLO PER APPUNTAMENTO",
    "hero_description": "Scopri l'eccellenza dell'hair styling al Bruno Melito Hair.",
    "primary_color": "#E8477C",
    "accent_color": "#2EC4B6",
    "bg_color": "#0a0a0f",
    "text_color": "#ffffff",
    "hours": {"mar": "08:00 - 19:00", "mer": "08:00 - 19:00", "gio": "08:00 - 19:00", "ven": "08:00 - 19:00", "sab": "08:00 - 19:00"}
}

async def public_get_website():
    cached = get_cached_website()
    if cached: return cached

    user = await get_public_admin_user()
    uid = user["id"] if user else None
    uid_filter = {"user_id": uid} if uid else {}

    (config_raw, reviews, gallery, services, card_templates_raw, operators, promotions, loyalty_rewards_data) = await asyncio.gather(
        db.website_config.find_one(uid_filter, {"_id": 0, "user_id": 0}),
        db.website_reviews.find(uid_filter, {"_id": 0, "user_id": 0}).to_list(100),
        db.website_gallery.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0, "user_id": 0}).sort("sort_order", 1).to_list(100),
        db.services.find(uid_filter, {"_id": 0}).sort("order", 1).to_list(100),
        db.card_templates.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100),
        db.operators.find(uid_filter, {"_id": 0, "user_id": 0}).to_list(50),
        db.promotions.find({"active": True}, {"_id": 0, "user_id": 0}).to_list(20),
        get_loyalty_rewards(uid or ""),
    )

    config = {**DEFAULT_WEBSITE_CONFIG, **(config_raw or {})}
    result = {
        "config": config, "reviews": reviews, "gallery": gallery, "services": services,
        "card_templates": card_templates_raw, "operators": operators,
        "promotions": promotions, "loyalty": {"points_per_euro": LOYALTY_POINTS_PER_EURO, "rewards": loyalty_rewards_data}
    }
    set_cached_website(result)
    return result

@router.get("/public/website")
async def get_website_data(response: Response):
    data = await public_get_website()
    response.headers["Cache-Control"] = "no-store"
    return data

@router.post("/public/booking")
@limiter.limit("10/minute")
async def create_public_booking(request: Request, data: PublicBookingRequest, background_tasks: BackgroundTasks):
    # 1. Get the admin user
    user = await get_public_admin_user()
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    # 2. Valida che data/ora richiesta rispetti gli orari di apertura
    _day_map = {0: "lun", 1: "mar", 2: "mer", 3: "gio", 4: "ven", 5: "sab", 6: "dom"}
    try:
        req_dt = datetime.strptime(data.date, "%Y-%m-%d")
        day_key = _day_map[req_dt.weekday()]
        config_raw = await db.website_config.find_one({"user_id": user_id}, {"_id": 0, "hours": 1})
        hours_cfg = (config_raw or {}).get("hours", DEFAULT_WEBSITE_CONFIG["hours"])
        if day_key not in hours_cfg:
            raise HTTPException(status_code=400, detail=f"Il salone è chiuso il {day_key.capitalize()}.")
        h_range = hours_cfg[day_key]  # es. "08:00 - 19:00"
        h_open, _, h_close = h_range.partition(" - ")
        if h_open and h_close and data.time:
            if not (h_open.strip() <= data.time.strip() < h_close.strip()):
                raise HTTPException(
                    status_code=400,
                    detail=f"Orario non disponibile. Il salone è aperto dalle {h_open.strip()} alle {h_close.strip()}."
                )
    except HTTPException:
        raise
    except Exception:
        pass  # se la config manca, non blocchiamo la prenotazione

    # 3. Fetch all active operators and current busy ones
    all_operators = await db.operators.find({"user_id": user_id, "active": True}).to_list(50)
    if not all_operators:
        raise HTTPException(status_code=400, detail="Nessun operatore disponibile")

    busy_apts = await db.appointments.find({
        "user_id": user_id, "date": data.date, "time": data.time,
        "status": {"$ne": "cancelled"}
    }).to_list(100)
    
    busy_operator_ids = {a.get("operator_id") for a in busy_apts if a.get("operator_id")}
    available_ops = [o for o in all_operators if o["id"] not in busy_operator_ids]

    # 3. Smart Assignment Logic
    assigned_op = None
    
    if data.operator_id:
        requested_op = next((o for o in all_operators if o["id"] == data.operator_id), None)
        if requested_op and requested_op["id"] not in busy_operator_ids:
            assigned_op = requested_op
        else:
            if available_ops:
                assigned_op = available_ops[0]
            else:
                raise HTTPException(status_code=409, detail="Tutti gli operatori sono occupati a quest'ora")
    else:
        if available_ops:
            assigned_op = available_ops[0]
        else:
            raise HTTPException(status_code=409, detail="Nessun operatore disponibile a quest'ora")

    # 4. Find or create client (deduplicato per telefono normalizzato + nome esatto)
    client_id, client_name, client_phone = await resolve_client(
        user_id, data.client_name, data.client_phone
    )

    # 5. Fetch services and calculate times
    services = await db.services.find({"id": {"$in": data.service_ids}, "user_id": user_id}).to_list(100)
    if not services:
        raise HTTPException(status_code=400, detail="Servizi non validi")

    total_duration = sum(s.get("duration", 0) for s in services)
    total_price = sum(s.get("price", 0) for s in services)
    end_time = calculate_end_time(data.time, total_duration)

    # 6. Create appointment
    appointment_id = str(uuid.uuid4())
    booking_token = str(uuid.uuid4())
    
    appointment_doc = {
        "id": appointment_id, "user_id": user_id, "client_id": client_id,
        "client_name": client_name, "client_phone": client_phone,
        "service_ids": data.service_ids,
        "services": [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services],
        "operator_id": assigned_op["id"], 
        "operator_name": assigned_op["name"], 
        "operator_color": assigned_op.get("color"),
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "source": "online", "notes": data.notes or "",
        "booking_token": booking_token, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment_doc)
    invalidate_website_cache()

    # 7. Notifications
    wa_result = False
    try:
        service_names = ", ".join([s["name"] for s in services])
        d_p = data.date.split('-')
        date_it = f"{d_p[2]}/{d_p[1]}/{d_p[0]}" if len(d_p) == 3 else data.date
        msg_bruno = f"🔔 NUOVA PRENOTAZIONE ONLINE!\n👤 Cliente: {data.client_name}\n📅 Data: {date_it}\n⏰ Ora: {data.time}\n✂️ Servizi: {service_names}\n\nhttps://brunomelitohair.it/admin"
        background_tasks.add_task(send_whatsapp, "3397833526", msg_bruno, user)
        client_msg = f"Ciao {data.client_name}! ✅ Prenotazione confermata per il {date_it} alle {data.time}. Ti aspettiamo! 💇"
        if data.client_phone:
            # Prefer template di conferma approvato su Meta
            background_tasks.add_task(send_automatic_message, data.client_phone, "conferma_prenotazione", [data.client_name, date_it, data.time], client_msg, user)
            wa_result = True
    except Exception:
        pass

    return {"success": True, "appointment_id": appointment_id, "wa_scheduled": wa_result}


class MyAppointmentsRequest(BaseModel):
    phone: str

@router.post("/public/my-appointments")
@limiter.limit("20/minute")
async def get_my_appointments(request: Request, data: MyAppointmentsRequest):
    if not data.phone or len(re.sub(r'\D', '', data.phone)) < 6:
        raise HTTPException(status_code=400, detail="Numero di telefono non valido")

    user = await get_public_admin_user()
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    phone_norm = normalize_phone_wa(data.phone)
    phone_digits = re.sub(r'\D', '', data.phone)

    # Trova cliente per telefono normalizzato
    candidates = await db.clients.find(
        {"user_id": user_id, "phone": {"$exists": True, "$ne": ""}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).to_list(20000)

    client_id = None
    client_name = None
    for c in candidates:
        if normalize_phone_wa(c.get("phone", "")) == phone_norm:
            client_id = c["id"]
            client_name = c.get("name")
            break

    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    three_months_ago = (now - timedelta(days=90)).date().isoformat()

    if client_id:
        query = {"user_id": user_id, "client_id": client_id, "date": {"$gte": three_months_ago}}
    else:
        suffix = phone_digits[-9:] if len(phone_digits) >= 9 else phone_digits
        query = {
            "user_id": user_id,
            "date": {"$gte": three_months_ago},
            "client_phone": {"$regex": re.escape(suffix)}
        }

    all_apts = await db.appointments.find(query, {"_id": 0}).sort("date", 1).to_list(200)

    upcoming = []
    history = []
    for apt in all_apts:
        booking_code = (apt.get("booking_token") or apt.get("id") or "")[:8].upper()
        services_raw = apt.get("services", [])
        service_names = [s["name"] if isinstance(s, dict) else str(s) for s in services_raw]
        item = {
            "id": apt["id"],
            "date": apt["date"],
            "time": apt["time"],
            "services": service_names,
            "service_ids": apt.get("service_ids", []),
            "operator_name": apt.get("operator_name"),
            "booking_code": booking_code,
            "total_price": apt.get("total_price", 0),
            "status": apt.get("status", "scheduled"),
        }
        if apt["date"] >= today and apt.get("status") != "cancelled":
            upcoming.append(item)
        else:
            history.append(item)

    history.sort(key=lambda x: (x["date"], x["time"]), reverse=True)
    return {"upcoming": upcoming, "history": history, "client_name": client_name}


@router.delete("/public/appointments/{appt_id}")
@limiter.limit("10/minute")
async def cancel_public_appointment(request: Request, appt_id: str, phone: str, background_tasks: BackgroundTasks):
    user = await get_public_admin_user()
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    apt = await db.appointments.find_one({"id": appt_id, "user_id": user_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    if normalize_phone_wa(phone) != normalize_phone_wa(apt.get("client_phone", "")):
        raise HTTPException(status_code=403, detail="Numero di telefono non corrispondente")

    if apt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Appuntamento già annullato")

    today = datetime.now(timezone.utc).date().isoformat()
    if apt["date"] < today:
        raise HTTPException(status_code=400, detail="Non è possibile annullare appuntamenti passati")

    await db.appointments.update_one(
        {"id": appt_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancelled_by": "client"}}
    )

    try:
        d_p = apt["date"].split('-')
        date_it = f"{d_p[2]}/{d_p[1]}/{d_p[0]}" if len(d_p) == 3 else apt["date"]
        service_names = ", ".join(s["name"] if isinstance(s, dict) else str(s) for s in apt.get("services", []))
        msg = (f"⚠️ ANNULLAMENTO ONLINE\n"
               f"👤 Cliente: {apt.get('client_name', 'N/D')}\n"
               f"📅 Data: {date_it}  ⏰ {apt.get('time', '')}\n"
               f"✂️ {service_names}")
        background_tasks.add_task(send_whatsapp, "3397833526", msg, user)
    except Exception:
        pass

    return {"success": True}


class ModifyAppointmentRequest(BaseModel):
    phone: str
    date: str
    time: str

@router.put("/public/appointments/{appt_id}")
@limiter.limit("10/minute")
async def modify_public_appointment(request: Request, appt_id: str, data: ModifyAppointmentRequest):
    user = await get_public_admin_user()
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    apt = await db.appointments.find_one({"id": appt_id, "user_id": user_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    if normalize_phone_wa(data.phone) != normalize_phone_wa(apt.get("client_phone", "")):
        raise HTTPException(status_code=403, detail="Numero di telefono non corrispondente")

    if apt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Appuntamento già annullato")

    today = datetime.now(timezone.utc).date().isoformat()
    if data.date < today:
        raise HTTPException(status_code=400, detail="Non puoi spostare un appuntamento nel passato")

    busy_apts = await db.appointments.find({
        "user_id": user_id, "date": data.date, "time": data.time,
        "status": {"$ne": "cancelled"}, "id": {"$ne": appt_id}
    }).to_list(100)
    busy_op_ids = {a.get("operator_id") for a in busy_apts if a.get("operator_id")}

    if apt.get("operator_id") in busy_op_ids:
        raise HTTPException(status_code=409, detail="L'operatore non è disponibile in questo orario. Scegli un altro orario.")

    end_time = calculate_end_time(data.time, apt.get("total_duration", 60))
    await db.appointments.update_one(
        {"id": appt_id},
        {"$set": {"date": data.date, "time": data.time, "end_time": end_time,
                  "modified_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@router.get("/website/config")
async def get_website_config(current_user: dict = Depends(get_current_user)):
    config = await db.website_config.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {**DEFAULT_WEBSITE_CONFIG, **(config or {})}

@router.put("/website/config")
async def update_website_config(data: dict, current_user: dict = Depends(get_current_user)):
    await db.website_config.update_one({"user_id": current_user["id"]}, {"$set": data}, upsert=True)
    invalidate_website_cache()
    return {"status": "ok"}

@router.get("/website/reviews")
async def get_website_reviews(current_user: dict = Depends(get_current_user)):
    return await db.website_reviews.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)


@router.post("/website/reviews")
async def create_website_review(data: dict, current_user: dict = Depends(get_current_user)):
    review = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "name": data.get("name", ""), "text": data.get("text", ""),
        "rating": data.get("rating", 5), "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.website_reviews.insert_one(review)
    invalidate_website_cache()
    return {k: v for k, v in review.items() if k != "_id"}


@router.put("/website/reviews/{review_id}")
async def update_website_review(review_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.update_one(
        {"id": review_id, "user_id": current_user["id"]},
        {"$set": {"name": data.get("name"), "text": data.get("text"), "rating": data.get("rating", 5)}}
    )
    invalidate_website_cache()
    return await db.website_reviews.find_one({"id": review_id}, {"_id": 0})


@router.delete("/website/reviews/{review_id}")
async def delete_website_review(review_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.delete_one({"id": review_id, "user_id": current_user["id"]})
    invalidate_website_cache()
    return {"success": True}


@router.get("/website/gallery")
async def get_website_gallery(current_user: dict = Depends(get_current_user)):
    return await db.website_gallery.find(
        {"user_id": current_user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}
    ).sort("sort_order", 1).to_list(200)


@router.post("/website/gallery")
async def create_website_gallery_item(data: dict, current_user: dict = Depends(get_current_user)):
    count = await db.website_gallery.count_documents({"user_id": current_user["id"], "is_deleted": {"$ne": True}})
    item = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "image_url": data.get("image_url", ""), "label": data.get("label", ""),
        "tag": data.get("tag", ""), "section": data.get("section", "gallery"),
        "file_type": data.get("file_type", "image"),
        "sort_order": count, "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.website_gallery.insert_one(item)
    invalidate_website_cache()
    return {k: v for k, v in item.items() if k != "_id"}


@router.put("/website/gallery/{item_id}")
async def update_website_gallery_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update_data = {k: data[k] for k in ("label", "tag", "sort_order", "section", "image_url") if k in data}
    if update_data:
        await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": update_data})
    invalidate_website_cache()
    return await db.website_gallery.find_one({"id": item_id}, {"_id": 0})


@router.delete("/website/gallery/{item_id}")
async def delete_website_gallery_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": {"is_deleted": True}})
    invalidate_website_cache()
    return {"success": True}


def init_storage(): pass


@router.post("/website/upload")
async def website_upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in (file.filename or "") else "jpg"
    image_exts = ("jpg", "jpeg", "png", "gif", "webp")
    video_exts = ("mp4", "webm", "mov")
    allowed = image_exts + video_exts
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Formato non supportato. Usa JPG, PNG, GIF, WebP, MP4, WebM o MOV.")

    mime_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "gif": "image/gif", "webp": "image/webp",
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime"
    }
    file_type = "video" if ext in video_exts else "image"
    max_size = 50 * 1024 * 1024 if file_type == "video" else 10 * 1024 * 1024

    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    if len(data) > max_size:
        raise HTTPException(status_code=400, detail=f"File troppo grande. Max {'50MB' if file_type == 'video' else '10MB'}.")
    # Scrittura in GridFS in threadpool: non blocca l'event loop su file grandi (video)
    result = await run_in_threadpool(put_object, path, data, mime_map.get(ext, "application/octet-stream"))

    doc = {
        "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": mime_map.get(ext, "application/octet-stream"), "size": result.get("size", len(data)),
        "file_type": file_type, "is_deleted": False, "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.website_files.insert_one(doc)
    return {"id": file_id, "path": result["path"], "url": f"/api/website/files/{file_id}", "file_type": file_type}


@router.get('/website/files/{file_id}')
async def website_serve_file(file_id: str, request: Request):
    """Serve file (image/video) da GridFS con supporto HTTP Range.

    I browser richiedono il byte-range (HTTP 206) per riprodurre i <video>: senza,
    il tag video resta vuoto pur mostrando la cornice. Per questo i video servono Range.
    """
    record = await db.website_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        # Fallback: file vecchi salvati direttamente in GridFS senza record website_files
        gf = await run_in_threadpool(open_grid, f"gridfs://{file_id}")
        if gf is None:
            raise HTTPException(status_code=404, detail="File non trovato")
        content_type = getattr(gf, "content_type", None) or "application/octet-stream"
        headers = {"Accept-Ranges": "bytes", "Content-Length": str(gf.length),
                   "Cache-Control": "public, max-age=31536000, immutable"}
        return StreamingResponse(_stream_grid(gf), media_type=content_type, headers=headers)

    content_type = record.get("content_type", "application/octet-stream")
    storage_path = record["storage_path"]
    range_header = request.headers.get("range")

    # VIDEO con Range: leggi da GridFS SOLO i byte richiesti (seek+read), senza
    # rileggere l'intero file. È ciò che rende fluida la riproduzione su mobile.
    if range_header and content_type.startswith("video/"):
        result = await run_in_threadpool(read_grid_range, storage_path, range_header)
        if result is not None:
            chunk, start, end, total = result
            headers = {
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
                "Cache-Control": "public, max-age=31536000, immutable",
            }
            return Response(content=chunk, status_code=206, media_type=content_type, headers=headers)

    # File su GridFS: STREAMING a blocchi da 256KB — non carica mai l'intero file
    # in memoria, così anche un video da 50MB non fa esplodere la RAM (causa dell'OOM).
    gf = await run_in_threadpool(open_grid, storage_path)
    if gf is not None:
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(gf.length),
            "Cache-Control": "public, max-age=31536000, immutable",
        }
        return StreamingResponse(_stream_grid(gf), media_type=content_type, headers=headers)

    # Legacy (immagini inline base64 / file locali): lettura in memoria.
    data, ct = await run_in_threadpool(get_object, storage_path)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(len(data)),
        "Cache-Control": "public, max-age=31536000, immutable",
    }
    return Response(content=data, media_type=content_type or ct, headers=headers)
