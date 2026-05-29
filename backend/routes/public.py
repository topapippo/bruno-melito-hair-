from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request, BackgroundTasks
from fastapi.responses import Response, FileResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import re
import base64
import requests as http_requests
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from database import db
from auth import get_current_user
from models import PublicBookingRequest
from utils import normalize_phone_wa

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.get("/ping")
async def ping():
    """Endpoint keepalive — usato dal frontend per mantenere il server sveglio su Render free tier."""
    return {"ok": True}

@router.get("/warmup")
async def warmup():
    """Sveglia il server e scalda la cache del sito pubblico. Usato da UptimeRobot ogni 5 min."""
    try:
        await public_get_website()
    except Exception:
        pass
    return {"ok": True}

# Email admin configurabile via env var (evita hardcoding)
PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "melitobruno@gmail.com")


def _normalize_phone(phone: str) -> str:
    """Normalizza il numero di telefono a solo cifre senza prefisso +39."""
    if not phone:
        return ""
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('0039'):
        digits = digits[4:]
    elif digits.startswith('39') and len(digits) > 10:
        digits = digits[2:]
    if digits.startswith('0') and len(digits) > 9:
        digits = digits[1:]
    return digits


def _phone_variants(phone: str) -> list:
    """Restituisce tutte le varianti con cui un numero può essere salvato in DB."""
    norm = _normalize_phone(phone)
    if not norm:
        return []
    variants = {phone.strip(), norm, f"+39{norm}", f"39{norm}", f"0039{norm}", f"0{norm}"}
    return list(variants)


def _phones_match(a: str, b: str) -> bool:
    """True se i due numeri rappresentano lo stesso telefono (indipendente dal prefisso)."""
    na, nb = _normalize_phone(a), _normalize_phone(b)
    return bool(na) and na == nb

# ============== Object Storage with Local Fallback ==============

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "mbhssalon"
_storage_key = None
_use_local_storage = False

# Local upload directory (use /tmp on platforms where /app is read-only)
LOCAL_UPLOAD_DIR = "/app/backend/uploads"
try:
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
except PermissionError:
    LOCAL_UPLOAD_DIR = "/tmp/uploads"
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


def init_storage():
    global _storage_key, _use_local_storage
    if _use_local_storage:
        return None
    if _storage_key:
        return _storage_key
    try:
        resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=5)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.warning(f"Object storage unavailable, using local storage: {e}")
        _use_local_storage = True
        return None


def _file_id_from_path(path: str) -> str:
    """Estrae il file_id (UUID) da un path qualsiasi: gridfs://, mongo://, local://
    o vecchi path remoti tipo 'mbhssalon/uploads/<id>.<ext>'."""
    filename = path.split("/")[-1]
    return filename.rsplit(".", 1)[0]


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Salva il file in GridFS (MongoDB). GridFS spezzetta i file in chunk, quindi
    NON c'è il limite di 16MB del singolo documento BSON: foto e video di qualsiasi
    dimensione vengono salvati e sopravvivono ai redeploy di Render.
    (Lo storage esterno Emergent è stato dismesso: non viene più usato.)"""
    from database import fs
    file_id = _file_id_from_path(path)
    # Rimuovi eventuali versioni precedenti con lo stesso id (re-upload)
    for old in fs.find({"filename": file_id}):
        fs.delete(old._id)
    fs.put(data, filename=file_id, content_type=content_type)
    return {"path": f"gridfs://{file_id}", "size": len(data)}


def get_object(path: str):
    from database import sync_db, fs

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
    se il file non è su GridFS (es. vecchie immagini inline) o il range non è valido."""
    from database import fs
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
            # Range aperto: restituiamo al massimo _RANGE_CHUNK byte
            end = min(start + _RANGE_CHUNK - 1, total - 1)
    except Exception:
        return None
    end = min(end, total - 1)
    if start < 0 or start > end or start >= total:
        return None
    gf.seek(start)
    chunk = gf.read(end - start + 1)
    return chunk, start, end, total


# ============== Default Website Config ==============

DEFAULT_WEBSITE_CONFIG = {
    "salon_name": "BRUNO MELITO HAIR",
    "slogan": "Metti la testa a posto!!",
    "subtitle": "SOLO PER APPUNTAMENTO",
    "hero_description": "Scopri l'eccellenza dell'hair styling al Bruno Melito Hair. Dove ogni taglio e' un'opera d'arte e ogni cliente e' unica.",
    "hero_image": "",
    "about_title": "Dal 1983 con Passione",
    "about_text": "Dal 1983 con grande soddisfazione nostra e delle clienti che ci seguono, siamo un punto di riferimento per chi cerca qualita' e professionalita' nell'hair styling.",
    "about_text_2": "Abbiamo introdotto una nuova linea di prodotti altamente curativi, di ultima generazione: shampoo, maschere e finishing, senza parabeni, solfati e sale. Le colorazioni e le schiariture sono senza ammoniaca, ma con cheratina, olio di semi di lino, proteine della seta e olio di argan.",
    "about_features": ["Dal 1983 nel settore", "Senza parabeni e solfati", "Colorazioni senza ammoniaca", "Cheratina e olio di argan"],
    "years_experience": "40+",
    "year_founded": "1983",
    "phones": ["0823 18 78 320", "339 78 33 526"],
    "email": "admin@brunomelito.it",
    "address": "Via Vito Nicola Melorio 101, Santa Maria Capua Vetere (CE)",
    "maps_url": "https://maps.google.com/?q=Via+Vito+Nicola+Melorio+101+Santa+Maria+Capua+Vetere",
    "whatsapp": "393397833526",
    "hours": {"mar": "08:00 - 13:00---14:00 - 19:00", "mer": "08:00 - 13:00---14:00 - 19:00", "gio": "08:00 - 13:00---14:00 - 19:00", "ven": "08:00 - 19:00", "sab": "08:00 - 19:00", "dom": "Chiuso", "lun": "Chiuso"},
    "service_categories": [
        {"title": "Taglio & Piega", "desc": "", "items": [{"name": "Taglio", "price": "10"}, {"name": "Piega Corti", "price": "10"}, {"name": "Piega Lunghi", "price": "12"}, {"name": "Piega Fantasy", "price": "15"}, {"name": "Piastra/Ferro", "price": "+ 3"}]},
        {"title": "Colorazione", "desc": "Tutte le colorazioni sono senza ammoniaca, con cheratina e olio di argan", "items": [{"name": "Colorazione Parziale / Completa / Cuffia / Cartine / Balayage / Giochi di Colore", "price": "Da 30"}]},
        {"title": "Modellanti", "desc": "", "items": [{"name": "Permanente / Ondulazione / Anticrespo / Stiratura Classica", "price": "Da 40"}]}
    ],
    "gallery_title": "Tendenze P/E 2026",
    "gallery_subtitle": "Lasciati ispirare dalle ultime tendenze Primavera Estate 2026.",
    "section_order": ["services", "team", "salon", "about", "promotions", "reviews", "gallery", "loyalty", "contact"],
    "hidden_sections": [],
    "upselling_rules": [],
    "upselling_discount": 15,
    "hero_slogan": "",
    "primary_color": "#E8477C",
    "accent_color": "#2EC4B6",
    "bg_color": "#FAFBFD",
    "text_color": "#1A1A2E",
    "font_display": "Cormorant Garamond",
    "font_body": "Nunito"
}


# ============== PUBLIC BOOKING ==============

async def get_public_admin_user():
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
    if not user:
        user = await db.users.find_one({}, {"_id": 0, "id": 1})
    return user

@router.get("/public/services")
async def get_public_services():
    user = await get_public_admin_user()
    if not user:
        logger.error(f"[public/services] Utente admin non trovato per email={PUBLIC_ADMIN_EMAIL}")
        return []
    services = await db.services.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("order", 1).to_list(100)
    logger.info(f"[public/services] user_id={user['id']} email={PUBLIC_ADMIN_EMAIL} servizi={len(services)}")
    return services


@router.get("/public/operators")
async def get_public_operators():
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
    if not user:
        user = await db.users.find_one({}, {"_id": 0, "id": 1})
    if not user:
        return []
    return await db.operators.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).to_list(50)


async def _send_booking_push(client_name, date_it, time, services_names, date_iso=""):
    """Invia push notification al salone (background)."""
    try:
        from routes.push import send_push_to_all
        url = f"/planning?date={date_iso}" if date_iso else "/planning"
        await send_push_to_all(
            title="🔔 Nuova Prenotazione Online!",
            body=f"{client_name} • {date_it} alle {time} • {services_names}",
            url=url,
        )
    except Exception as e:
        logger.warning(f"Push notifica prenotazione fallita: {e}")


async def _send_booking_wa(client_phone, client_name, date_it, time, services_names, appointment_id, salon_name, user) -> bool:
    """Invia WA di conferma al cliente. Ritorna True se inviato con successo."""
    if not client_phone:
        return False
    try:
        from utils import send_automatic_message
        fallback_msg = (
            f"✅ Prenotazione confermata!\n\n"
            f"Ciao {client_name}! La tua prenotazione da *{salon_name}* è confermata:\n\n"
            f"📅 {date_it} alle {time}\n"
            f"✂️ {services_names}\n"
            f"🔖 Codice: {appointment_id[:8].upper()}\n\n"
            f"Per disdire o modificare rispondi a questo messaggio. A presto! 💇"
        )
        result = await send_automatic_message(
            client_phone,
            template_name="promemoria_appuntamento",
            template_vars=[client_name, date_it, time],
            fallback_text=fallback_msg,
            user=user,
        )
        if result.get("sent"):
            logger.info(f"WA conferma prenotazione inviata a {client_phone} via {result.get('method')}")
            return True
        logger.warning(f"WA conferma FALLITA {client_phone}: {result.get('error')}")
        return False
    except Exception as e:
        logger.warning(f"WA conferma eccezione: {e}")
        return False


@router.post("/public/booking")
@limiter.limit("10/minute")
async def create_public_booking(request: Request, data: PublicBookingRequest, background_tasks: BackgroundTasks):
    import asyncio as _asyncio
    from datetime import datetime as dt

    # Step 1: ottieni utente (necessario per tutte le query successive)
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    # Validazione data/ora (puro Python, istantanea)
    day_names = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    try:
        booking_date = dt.strptime(data.date, "%Y-%m-%d")
        day_of_week = day_names[booking_date.weekday()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")

    now_rome = datetime.now(timezone(timedelta(hours=2)))
    booking_aware = dt.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone(timedelta(hours=2)))
    if booking_aware <= now_rome:
        raise HTTPException(status_code=400, detail="Non puoi prenotare per un orario già passato.")

    # Step 2: tutte le query iniziali in PARALLELO
    phone_variants_list = _phone_variants(data.client_phone) if data.client_phone else []
    # Se non ci sono varianti telefono, usiamo un filtro impossibile che ritorna None immediatamente
    phone_filter = {"user_id": user_id, "phone": {"$in": phone_variants_list}} if phone_variants_list else {"_id": "__no_match__"}
    (
        blocked_one, blocked_rec, busy_at_time, all_operators, client_by_phone, services
    ) = await _asyncio.gather(
        db.blocked_slots.find_one({"user_id": user_id, "type": "one-time", "date": data.date, "start_time": {"$lte": data.time}, "end_time": {"$gt": data.time}}, {"_id": 0}),
        db.blocked_slots.find_one({"user_id": user_id, "type": "recurring", "day_of_week": day_of_week, "start_time": {"$lte": data.time}, "end_time": {"$gt": data.time}}, {"_id": 0}),
        db.appointments.find({"user_id": user_id, "date": data.date, "time": data.time, "status": {"$ne": "cancelled"}}, {"_id": 0, "operator_id": 1}).to_list(50),
        db.operators.find({"user_id": user_id, "active": True}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50),
        db.clients.find_one(phone_filter, {"_id": 0, "id": 1, "name": 1, "phone": 1}),
        db.services.find({"id": {"$in": data.service_ids}, "user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(20),
    )

    # Controllo slot bloccati
    if blocked_one or blocked_rec:
        reason = (blocked_one or blocked_rec).get("reason", "")
        raise HTTPException(status_code=409, detail={
            "message": f"Questo orario è bloccato{': ' + reason if reason else ''}. Scegli un altro orario.",
            "conflict": True, "blocked": True, "available_operators": [], "alternative_slots": []
        })

    # Controllo conflitti
    busy_op_ids = [a.get("operator_id") for a in busy_at_time if a.get("operator_id")]
    available_operators = [{"id": o["id"], "name": o["name"]} for o in all_operators if o["id"] not in busy_op_ids]

    has_conflict = (data.operator_id in busy_op_ids) if data.operator_id else (len(busy_at_time) > 0)

    if has_conflict:
        all_apts = await db.appointments.find(
            {"user_id": user_id, "date": data.date, "status": {"$ne": "cancelled"}},
            {"_id": 0, "time": 1, "operator_id": 1}
        ).to_list(200)
        target_op = data.operator_id
        busy_times = {a.get("time") for a in all_apts if not target_op or a.get("operator_id") == target_op}
        h, m = map(int, data.time.split(":"))
        base = h * 60 + m
        alternative_slots = []
        for offset in range(-120, 121, 15):
            t_min = base + offset
            if t_min < 480 or t_min > 1200 or offset == 0:
                continue
            t_str = f"{t_min // 60:02d}:{t_min % 60:02d}"
            if t_str not in busy_times:
                op = next((o for o in all_operators if o["id"] == target_op), None) if target_op else None
                alternative_slots.append({"date": data.date, "time": t_str, "operator_id": target_op or "", "operator_name": op["name"] if op else "Disponibile"})
                if len(alternative_slots) >= 4:
                    break
        conflict_msg = "Orario già occupato. Scegli un altro orario."
        if available_operators:
            conflict_msg = f"Orario occupato. Disponibili: {', '.join(o['name'] for o in available_operators)}. Scegli un operatore o un orario alternativo."
        raise HTTPException(status_code=409, detail={"message": conflict_msg, "conflict": True, "available_operators": available_operators, "alternative_slots": alternative_slots})

    # Ricerca cliente: prima via $in (veloce), poi fallback per numeri con formati diversi
    client = client_by_phone
    if not client:
        incoming_phone_norm = _normalize_phone(data.client_phone)
        incoming_name_lower = (data.client_name or "").strip().lower()
        # Fallback: regex sulle ultime 9 cifre (copre numeri salvati con spazi/trattini)
        if incoming_phone_norm and len(incoming_phone_norm) >= 9:
            suffix = incoming_phone_norm[-9:]
            client = await db.clients.find_one(
                {"user_id": user_id, "phone": {"$regex": suffix}},
                {"_id": 0, "id": 1, "name": 1, "phone": 1}
            )
        # Fallback finale: cerca per nome esatto
        if not client and incoming_name_lower:
            client = await db.clients.find_one(
                {"user_id": user_id, "name": {"$regex": f"^{re.escape(incoming_name_lower)}$", "$options": "i"}},
                {"_id": 0, "id": 1, "name": 1, "phone": 1}
            )

    if client:
        client_id = client["id"]
        if not client.get("phone") and data.client_phone:
            await db.clients.update_one({"id": client_id, "user_id": user_id}, {"$set": {"phone": data.client_phone}})
    else:
        client_id = str(uuid.uuid4())
        await db.clients.insert_one({
            "id": client_id, "user_id": user_id, "name": data.client_name,
            "phone": data.client_phone,
            "notes": f"[Online] {data.notes}" if data.notes else "[Prenotazione Online]",
            "send_sms_reminders": True, "created_at": datetime.now(timezone.utc).isoformat()
        })

    if not services:
        raise HTTPException(status_code=400, detail="Servizi non validi")

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    start_hour, start_min = map(int, data.time.split(":"))
    end_time = f"{(start_hour * 60 + start_min + total_duration) // 60:02d}:{(start_hour * 60 + start_min + total_duration) % 60:02d}"

    # Operatore (da dati già caricati — nessuna query extra)
    assigned_operator_id = data.operator_id or None
    operator_name = operator_color = None
    op_match = next((o for o in all_operators if o["id"] == assigned_operator_id), None) if assigned_operator_id else None
    if op_match:
        operator_name, operator_color = op_match["name"], op_match.get("color")
    elif not assigned_operator_id and all_operators:
        first_op = all_operators[0]
        assigned_operator_id, operator_name, operator_color = first_op["id"], first_op["name"], first_op.get("color")

    # Doppio controllo anti-race: ri-verifica lo slot subito prima dell'insert
    # (chiude la finestra critica tra il check iniziale e il salvataggio)
    if assigned_operator_id:
        recent_conflict = await db.appointments.find_one(
            {"user_id": user_id, "date": data.date, "time": data.time,
             "operator_id": assigned_operator_id, "status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1}
        )
        if recent_conflict:
            raise HTTPException(status_code=409, detail={
                "message": "Questo orario è stato appena prenotato da qualcun altro. Scegli un altro orario.",
                "conflict": True, "available_operators": [], "alternative_slots": []
            })

    appointment_id = str(uuid.uuid4())
    booking_token = str(uuid.uuid4())
    await db.appointments.insert_one({
        "id": appointment_id, "user_id": user_id, "client_id": client_id,
        "client_name": data.client_name, "service_ids": data.service_ids, "services": services,
        "operator_id": assigned_operator_id, "operator_name": operator_name, "operator_color": operator_color,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled",
        "notes": f"[Online] {data.notes}" if data.notes else "[Prenotazione Online]",
        "source": "online", "booking_token": booking_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    d = data.date.split("-")
    date_it = f"{d[2]}/{d[1]}/{d[0][2:]}" if len(d) == 3 else data.date
    services_names = ", ".join(s.get("name", "") for s in services)

    # Push al salone in background (non blocca la risposta)
    background_tasks.add_task(_send_booking_push, client_name=data.client_name, date_it=date_it, time=data.time, services_names=services_names, date_iso=data.date)

    # WA al cliente in modo sincrono — così il frontend sa se il messaggio è partito
    wa_sent = await _send_booking_wa(
        client_phone=data.client_phone or "",
        client_name=data.client_name,
        date_it=date_it, time=data.time,
        services_names=services_names,
        appointment_id=appointment_id,
        salon_name=user.get("salon_name", "Bruno Melito Hair"),
        user=user,
    )

    return {"success": True, "appointment_id": appointment_id, "booking_code": appointment_id[:8].upper(), "booking_token": booking_token, "wa_sent": wa_sent}



@router.get("/public/upselling")
async def get_upselling_suggestions(service_ids: str):
    """Get upselling suggestions based on booked service IDs."""
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        return []
    user_id = user["id"]
    booked_ids = [s.strip() for s in service_ids.split(",") if s.strip()]
    config = await db.website_config.find_one({"user_id": user_id}, {"_id": 0})
    if not config:
        return []
    rules = config.get("upselling_rules", [])
    discount = config.get("upselling_discount", 15)
    suggested_ids = set()
    for rule in rules:
        if rule.get("trigger_service_id") in booked_ids:
            for sid in rule.get("suggested_service_ids", []):
                if sid not in booked_ids:
                    suggested_ids.add(sid)
    if not suggested_ids:
        return []
    services = await db.services.find(
        {"id": {"$in": list(suggested_ids)}, "user_id": user_id},
        {"_id": 0, "user_id": 0}
    ).to_list(20)
    for s in services:
        s["original_price"] = s["price"]
        s["discounted_price"] = round(s["price"] * (1 - discount / 100), 2)
        s["discount_percent"] = discount
    return services


@router.post("/public/appointments/{appointment_id}/add-service")
async def add_service_to_appointment(appointment_id: str, data: dict):
    """Add an upselling service to an existing appointment with discount."""
    service_id = data.get("service_id")
    phone = data.get("phone")
    if not service_id or not phone:
        raise HTTPException(status_code=400, detail="Servizio e telefono richiesti")
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": user_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    if not _phones_match(apt.get("client_phone", ""), phone) and apt.get("client_name", "").lower() != phone.lower():
        client = await db.clients.find_one({"id": apt.get("client_id")}, {"_id": 0})
        if not client or not _phones_match(client.get("phone", ""), phone):
            raise HTTPException(status_code=403, detail="Telefono non corrisponde")
    service = await db.services.find_one({"id": service_id, "user_id": user_id}, {"_id": 0, "user_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    config = await db.website_config.find_one({"user_id": user_id}, {"_id": 0})
    discount = (config or {}).get("upselling_discount", 15)
    discounted_price = round(service["price"] * (1 - discount / 100), 2)
    service_entry = {**service, "price": discounted_price, "original_price": service["price"], "upselling": True}
    existing_ids = apt.get("service_ids", [])
    if service_id in existing_ids:
        raise HTTPException(status_code=400, detail="Servizio già presente nell'appuntamento")
    new_services = apt.get("services", []) + [service_entry]
    new_service_ids = existing_ids + [service_id]
    new_total_price = apt.get("total_price", 0) + discounted_price
    new_total_duration = apt.get("total_duration", 0) + service.get("duration", 0)
    start_hour, start_min = map(int, apt["time"].split(":"))
    end_minutes = start_hour * 60 + start_min + new_total_duration
    new_end_time = f"{end_minutes // 60:02d}:{end_minutes % 60:02d}"
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "services": new_services, "service_ids": new_service_ids,
            "total_price": new_total_price, "total_duration": new_total_duration,
            "end_time": new_end_time,
            "notes": (apt.get("notes", "") + f" [Upselling: {service['name']} -{discount}%]").strip()
        }}
    )
    return {"success": True, "service_name": service["name"], "discounted_price": discounted_price, "new_total": new_total_price}



class _PhoneLookupRequest(BaseModel):
    phone: str


@router.post("/public/my-appointments")
async def public_lookup_appointments(data: _PhoneLookupRequest):
    phone = data.phone
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    variants = _phone_variants(phone)
    if not variants:
        return {"upcoming": [], "history": [], "client_name": ""}
    client = await db.clients.find_one(
        {"user_id": user["id"], "phone": {"$in": variants}}, {"_id": 0}
    )
    if not client:
        # Fallback to normalized comparison so stored clients with formatted phone values
        # (spaces, dashes, parentheses) still match public lookups.
        all_clients = await db.clients.find(
            {"user_id": user["id"]}, {"_id": 0, "id": 1, "phone": 1, "name": 1}
        ).to_list(5000)
        for candidate in all_clients:
            if _phones_match(candidate.get("phone", ""), phone):
                client = candidate
                break
    if not client:
        return {"upcoming": [], "history": [], "client_name": ""}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
    upcoming = await db.appointments.find(
        {"user_id": user["id"], "client_id": client["id"], "date": {"$gte": today}, "status": {"$ne": "cancelled"}},
        {"_id": 0, "user_id": 0}
    ).sort("date", 1).to_list(20)
    history = await db.appointments.find(
        {"user_id": user["id"], "client_id": client["id"], "date": {"$lt": today, "$gte": three_months_ago}},
        {"_id": 0, "user_id": 0}
    ).sort("date", -1).to_list(50)
    def fmt(a):
        return {"id": a["id"], "date": a["date"], "time": a["time"],
                "services": [s["name"] for s in a.get("services", [])],
                "service_ids": [s["id"] for s in a.get("services", []) if s.get("id")],
                "operator_name": a.get("operator_name", ""), "status": a.get("status", "scheduled"),
                "total_price": a.get("total_price", 0), "booking_code": a["id"][:8].upper()}
    return {"upcoming": [fmt(a) for a in upcoming], "history": [fmt(a) for a in history], "client_name": client.get("name", "")}


def _verify_public_appointment_access(apt: dict, client: dict, token: str, phone: str) -> bool:
    """Verifica accesso pubblico: prima tramite booking_token, poi fallback a telefono."""
    stored_token = apt.get("booking_token", "")
    if stored_token and token and stored_token == token:
        return True
    if phone and client and _phones_match(client.get("phone", ""), phone):
        return True
    return False


@router.put("/public/appointments/{appointment_id}")
async def public_update_appointment(appointment_id: str, data: dict):
    token = data.get("booking_token", "")
    phone = data.get("phone", "")
    if not token and not phone:
        raise HTTPException(status_code=400, detail="Token di prenotazione o numero di telefono richiesto")
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    client = await db.clients.find_one({"id": apt["client_id"]}, {"_id": 0})
    if not _verify_public_appointment_access(apt, client, token, phone):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    new_date = data.get("date", apt["date"])
    new_time = data.get("time", apt["time"])
    existing = await db.appointments.find_one({
        "user_id": user["id"], "date": new_date, "time": new_time,
        "id": {"$ne": appointment_id}, "operator_id": apt.get("operator_id")
    })
    if existing:
        raise HTTPException(status_code=400, detail="Orario già occupato")
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"date": new_date, "time": new_time}})
    return {"success": True}


@router.delete("/public/appointments/{appointment_id}")
async def public_cancel_appointment(appointment_id: str, phone: str = "", booking_token: str = ""):
    if not phone and not booking_token:
        raise HTTPException(status_code=400, detail="Token di prenotazione o numero di telefono richiesto")
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    client = await db.clients.find_one({"id": apt["client_id"]}, {"_id": 0})
    if not _verify_public_appointment_access(apt, client, booking_token, phone):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": "cancelled"}})
    return {"success": True}


# ============== WEBSITE CMS ==============

@router.post("/website/upload")
async def website_upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
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


@router.get("/website/files/{file_id}")
async def website_serve_file(file_id: str, request: Request):
    record = await db.website_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File non trovato")

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

    # Immagini, o file non su GridFS, o video senza Range: lettura completa (in threadpool).
    data, ct = await run_in_threadpool(get_object, storage_path)
    content_type = content_type or ct
    total_size = len(data)

    # Video senza Range header ma file su GridFS: comunque accettiamo Range per il futuro.
    if range_header and content_type.startswith("video/"):
        try:
            range_val = range_header.replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str.strip() else total_size - 1
            end = min(end, total_size - 1)
            chunk = data[start:end + 1]
            headers = {
                "Content-Range": f"bytes {start}-{end}/{total_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
                "Cache-Control": "public, max-age=31536000, immutable",
            }
            return Response(content=chunk, status_code=206, media_type=content_type, headers=headers)
        except Exception as e:
            logger.warning(f"Range parsing fallito per {file_id}: {e}")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(total_size),
        "Cache-Control": "public, max-age=31536000, immutable",
    }
    return Response(content=data, media_type=content_type, headers=headers)


@router.get("/website/config")
async def get_website_config(current_user: dict = Depends(get_current_user)):
    config = await db.website_config.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not config:
        return {**DEFAULT_WEBSITE_CONFIG, "user_id": current_user["id"]}
    return {**DEFAULT_WEBSITE_CONFIG, **config}


class WebsiteConfigUpdate(BaseModel):
    salon_name: Optional[str] = None
    slogan: Optional[str] = None
    subtitle: Optional[str] = None
    hero_description: Optional[str] = None
    hero_image: Optional[str] = None
    about_title: Optional[str] = None
    about_text: Optional[str] = None
    about_text_2: Optional[str] = None
    about_features: Optional[List[str]] = None
    years_experience: Optional[str] = None
    year_founded: Optional[str] = None
    phones: Optional[List[str]] = None
    email: Optional[str] = None
    address: Optional[str] = None
    maps_url: Optional[str] = None
    whatsapp: Optional[str] = None
    hours: Optional[dict] = None
    service_categories: Optional[List[Any]] = None
    gallery_title: Optional[str] = None
    gallery_subtitle: Optional[str] = None
    section_order: Optional[List[str]] = None
    hidden_sections: Optional[List[str]] = None
    upselling_rules: Optional[List[Any]] = None
    upselling_discount: Optional[float] = None
    hero_slogan: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    font_display: Optional[str] = None
    font_body: Optional[str] = None

    @field_validator("upselling_discount")
    @classmethod
    def discount_range(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Lo sconto deve essere tra 0 e 100")
        return v


@router.put("/website/config")
async def update_website_config(data: WebsiteConfigUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["user_id"] = current_user["id"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.website_config.update_one({"user_id": current_user["id"]}, {"$set": update_data}, upsert=True)
    _invalidate_website_cache()
    return await db.website_config.find_one({"user_id": current_user["id"]}, {"_id": 0})


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
    _invalidate_website_cache()
    return {k: v for k, v in review.items() if k != "_id"}


@router.put("/website/reviews/{review_id}")
async def update_website_review(review_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.update_one(
        {"id": review_id, "user_id": current_user["id"]},
        {"$set": {"name": data.get("name"), "text": data.get("text"), "rating": data.get("rating", 5)}}
    )
    _invalidate_website_cache()
    return await db.website_reviews.find_one({"id": review_id}, {"_id": 0})


@router.delete("/website/reviews/{review_id}")
async def delete_website_review(review_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.delete_one({"id": review_id, "user_id": current_user["id"]})
    _invalidate_website_cache()
    return {"success": True}


@router.get("/website/gallery")
async def get_website_gallery(current_user: dict = Depends(get_current_user)):
    return await db.website_gallery.find(
        {"user_id": current_user["id"], "is_deleted": {"$ne": True}}, {"_id": 0}
    ).sort("sort_order", 1).to_list(100)


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
    _invalidate_website_cache()
    return {k: v for k, v in item.items() if k != "_id"}


@router.put("/website/gallery/{item_id}")
async def update_website_gallery_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update_data = {}
    for key in ["label", "tag", "sort_order", "section", "image_url"]:
        if key in data:
            update_data[key] = data[key]
    if update_data:
        await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": update_data})
    _invalidate_website_cache()
    return await db.website_gallery.find_one({"id": item_id}, {"_id": 0})


@router.delete("/website/gallery/{item_id}")
async def delete_website_gallery_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": {"is_deleted": True}})
    _invalidate_website_cache()
    return {"success": True}


_website_cache: dict = {"data": None, "ts": 0}
_WEBSITE_CACHE_TTL = 600  # 10 minuti


def _invalidate_website_cache():
    _website_cache["data"] = None
    _website_cache["ts"] = 0

@router.get("/public/website")
async def public_get_website():
    import time as _time
    now = _time.time()
    if _website_cache["data"] and now - _website_cache["ts"] < _WEBSITE_CACHE_TTL:
        return _website_cache["data"]

    user = await get_public_admin_user()
    uid = user["id"] if user else None
    uid_filter = {"user_id": uid} if uid else {}

    # Tutte le query in parallelo — inclusa loyalty rewards (era sequenziale)
    import asyncio as _asyncio
    from models import get_loyalty_rewards, LOYALTY_POINTS_PER_EURO
    (
        config_raw, reviews, gallery, services,
        card_templates_raw, operators, promotions, loyalty_rewards_data
    ) = await _asyncio.gather(
        db.website_config.find_one({**uid_filter}, {"_id": 0, "user_id": 0}),
        db.website_reviews.find({**uid_filter}, {"_id": 0, "user_id": 0}).to_list(100),
        db.website_gallery.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0, "user_id": 0}).sort("sort_order", 1).to_list(100),
        db.services.find({**uid_filter}, {"_id": 0}).sort("order", 1).to_list(100),
        db.card_templates.find({**uid_filter, "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100),
        db.operators.find({**uid_filter}, {"_id": 0, "user_id": 0}).to_list(50),
        db.promotions.find({"active": True, "show_on_booking": True}, {"_id": 0, "user_id": 0}).to_list(20),
        get_loyalty_rewards(uid or ""),
    )

    config = {**DEFAULT_WEBSITE_CONFIG, **{k: v for k, v in (config_raw or {}).items() if k != "user_id"}} if config_raw else {k: v for k, v in DEFAULT_WEBSITE_CONFIG.items()}
    card_templates = [{"id": ct.get("id",""), "name": ct.get("name",""), "card_type": ct.get("card_type",""), "total_value": ct.get("total_value",0), "total_services": ct.get("total_services",0), "duration_months": ct.get("duration_months",0), "notes": ct.get("notes","")} for ct in card_templates_raw]
    loyalty_config = {"points_per_euro": LOYALTY_POINTS_PER_EURO, "rewards": loyalty_rewards_data}

    result = {"config": config, "reviews": reviews, "gallery": gallery, "services": services, "card_templates": card_templates, "operators": operators, "promotions": promotions, "loyalty": loyalty_config}
    _website_cache["data"] = result
    _website_cache["ts"] = now
    return result


@router.post("/public/website/cache/clear")
async def clear_website_cache():
    _website_cache["data"] = None
    _website_cache["ts"] = 0
    return {"cleared": True}


# ============== CONFERMA APPUNTAMENTO ==============

@router.get("/public/confirm-info/{token}")
@limiter.limit("20/minute")
async def get_confirmation_info(request: Request, token: str):
    """Restituisce i dati dell'appuntamento associato al token (endpoint pubblico, no auth)."""
    apt = await db.appointments.find_one({"confirmation_token": token}, {"_id": 0, "user_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Link di conferma non valido o scaduto")
    return {
        "id": apt["id"],
        "client_name": apt.get("client_name", ""),
        "date": apt.get("date", ""),
        "time": apt.get("time", ""),
        "services": [s.get("name", "") for s in apt.get("services", [])],
        "confirmation_status": apt.get("confirmation_status"),
    }


class ConfirmActionRequest(BaseModel):
    action: str  # "si" o "no"


@router.post("/public/confirm/{token}")
@limiter.limit("10/minute")
async def confirm_appointment_by_token(request: Request, token: str, data: ConfirmActionRequest):
    """Il cliente conferma (si) o disdice (no) il proprio appuntamento tramite link."""
    if data.action not in ("si", "no"):
        raise HTTPException(status_code=400, detail="Azione non valida. Usa 'si' o 'no'")
    apt = await db.appointments.find_one({"confirmation_token": token}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Link di conferma non valido o scaduto")
    if apt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Questo appuntamento è già stato cancellato")
    new_status = "confirmed" if data.action == "si" else "cancelled_by_client"
    await db.appointments.update_one(
        {"confirmation_token": token},
        {"$set": {
            "confirmation_status": new_status,
            "confirmation_responded_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if data.action == "no":
        await db.appointments.update_one(
            {"confirmation_token": token},
            {"$set": {"status": "cancelled"}}
        )
    return {
        "success": True,
        "action": data.action,
        "client_name": apt.get("client_name", ""),
        "date": apt.get("date", ""),
        "time": apt.get("time", ""),
    }
