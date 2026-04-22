from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import re
import requests as http_requests
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from database import db
from auth import get_current_user
from models import PublicBookingRequest

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

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
        resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=10)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.warning(f"Object storage unavailable, using local storage: {e}")
        _use_local_storage = True
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _use_local_storage
    
    # Try remote storage first
    if not _use_local_storage:
        try:
            key = init_storage()
            if key:
                resp = http_requests.put(
                    f"{STORAGE_URL}/objects/{path}",
                    headers={"X-Storage-Key": key, "Content-Type": content_type},
                    data=data, timeout=120
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning(f"Remote storage failed, falling back to MongoDB: {e}")
            _use_local_storage = True
    
    # Fallback to MongoDB storage (survives Render redeploys)
    import base64
    filename = path.split("/")[-1]
    b64_data = base64.b64encode(data).decode('utf-8')
    # Store will happen in the upload handler via db directly
    return {"path": f"mongo://{filename}", "size": len(data), "_mongo_data": b64_data, "_content_type": content_type}


def get_object(path: str):
    global _use_local_storage
    
    # Check MongoDB storage
    if path.startswith("mongo://") or path.startswith("local://"):
        import base64
        filename = path.replace("mongo://", "").replace("local://", "")
        file_id = filename.split(".")[0]
        
        # Use sync pymongo for this
        from database import sync_db
        record = sync_db.website_files.find_one({"id": file_id})
        if record and record.get("file_data"):
            data = base64.b64decode(record["file_data"])
            ct = record.get("content_type", "application/octet-stream")
            return data, ct
        
        # Fallback to local filesystem (old files)
        if path.startswith("local://"):
            local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    data = f.read()
                ext = filename.split(".")[-1].lower()
                mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
                return data, mime_map.get(ext, "application/octet-stream")
        raise HTTPException(status_code=404, detail="File non trovato")
    
    # Try remote storage
    try:
        key = init_storage()
        if key:
            resp = http_requests.get(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key}, timeout=60
            )
            resp.raise_for_status()
            return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    except Exception as e:
        logger.error(f"Failed to get object from remote storage: {e}")
    
    raise HTTPException(status_code=404, detail="File non trovato")


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
    "section_order": ["services", "salon", "about", "promotions", "reviews", "gallery", "loyalty", "contact"],
    "upselling_rules": [],
    "upselling_discount": 15
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


@router.post("/public/booking")
@limiter.limit("5/minute;20/hour")
async def create_public_booking(request: Request, data: PublicBookingRequest):
    user = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0})
    if not user:
        user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Salone non configurato")
    user_id = user["id"]

    # Check if time is blocked
    day_names = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    from datetime import datetime as dt
    try:
        booking_date = dt.strptime(data.date, "%Y-%m-%d")
        day_of_week = day_names[booking_date.weekday()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Data non valida")

    # Reject bookings in the past
    now_rome = datetime.now(timezone(timedelta(hours=2)))
    booking_naive = dt.strptime(f"{data.date} {data.time}", "%Y-%m-%d %H:%M")
    booking_aware = booking_naive.replace(tzinfo=timezone(timedelta(hours=2)))
    if booking_aware <= now_rome:
        raise HTTPException(status_code=400, detail="Non puoi prenotare per un orario già passato.")
    blocked_one = await db.blocked_slots.find_one(
        {"user_id": user_id, "type": "one-time", "date": data.date,
         "start_time": {"$lte": data.time}, "end_time": {"$gt": data.time}}, {"_id": 0})
    blocked_rec = await db.blocked_slots.find_one(
        {"user_id": user_id, "type": "recurring", "day_of_week": day_of_week,
         "start_time": {"$lte": data.time}, "end_time": {"$gt": data.time}}, {"_id": 0})
    if blocked_one or blocked_rec:
        reason = (blocked_one or blocked_rec).get("reason", "")
        raise HTTPException(status_code=409, detail={
            "message": f"Questo orario è bloccato{': ' + reason if reason else ''}. Scegli un altro orario.",
            "conflict": True, "blocked": True, "available_operators": [], "alternative_slots": []
        })

    # Check for conflicts at requested time slot
    busy_at_time = await db.appointments.find(
        {"user_id": user_id, "date": data.date, "time": data.time, "status": {"$ne": "cancelled"}},
        {"_id": 0, "operator_id": 1}
    ).to_list(50)
    busy_op_ids = [a.get("operator_id") for a in busy_at_time if a.get("operator_id")]

    all_operators = await db.operators.find(
        {"user_id": user_id, "active": True}, {"_id": 0, "id": 1, "name": 1}
    ).to_list(50)
    available_operators = [{"id": o["id"], "name": o["name"]} for o in all_operators if o["id"] not in busy_op_ids]

    has_conflict = False
    if data.operator_id:
        if data.operator_id in busy_op_ids:
            has_conflict = True
    else:
        if len(busy_at_time) > 0:
            # Mostra sempre gli operatori disponibili come scelta quando almeno uno è occupato
            has_conflict = True

    if has_conflict:
        all_apts = await db.appointments.find(
            {"user_id": user_id, "date": data.date, "status": {"$ne": "cancelled"}},
            {"_id": 0, "time": 1, "operator_id": 1}
        ).to_list(200)
        busy_times_for_op = set()
        target_op = data.operator_id
        for a in all_apts:
            if not target_op or a.get("operator_id") == target_op:
                busy_times_for_op.add(a.get("time"))

        h, m = map(int, data.time.split(":"))
        base = h * 60 + m
        alternative_slots = []
        for offset in range(-120, 121, 15):
            t_min = base + offset
            if t_min < 480 or t_min > 1200 or offset == 0:
                continue
            t_str = f"{t_min // 60:02d}:{t_min % 60:02d}"
            if t_str not in busy_times_for_op:
                op_name = None
                if target_op:
                    op = next((o for o in all_operators if o["id"] == target_op), None)
                    op_name = op["name"] if op else None
                alternative_slots.append({"date": data.date, "time": t_str, "operator_id": target_op or "", "operator_name": op_name or "Disponibile"})
                if len(alternative_slots) >= 4:
                    break

        conflict_msg = "Orario già occupato. Scegli un altro orario."
        if available_operators:
            names = ", ".join([o["name"] for o in available_operators])
            conflict_msg = f"Orario occupato da un operatore. Disponibili: {names}. Scegli un operatore o un orario alternativo."
        raise HTTPException(
            status_code=409,
            detail={
                "message": conflict_msg,
                "conflict": True,
                "available_operators": available_operators,
                "alternative_slots": alternative_slots
            }
        )

    # Cerca cliente esistente per telefono (normalizzato) o per nome
    incoming_phone_norm = _normalize_phone(data.client_phone)
    incoming_name_lower = (data.client_name or "").strip().lower()
    client = None

    if incoming_phone_norm and len(incoming_phone_norm) >= 6:
        # Cerca per telefono normalizzato
        all_clients = await db.clients.find(
            {"user_id": user_id}, {"_id": 0, "id": 1, "name": 1, "phone": 1}
        ).to_list(5000)
        for c in all_clients:
            stored_norm = _normalize_phone(c.get("phone", ""))
            if stored_norm and stored_norm == incoming_phone_norm:
                client = c
                break
            # Match anche sulle ultime 9+ cifre per formati diversi
            if stored_norm and len(stored_norm) >= 9 and len(incoming_phone_norm) >= 9:
                if stored_norm[-9:] == incoming_phone_norm[-9:]:
                    client = c
                    break

    # Fallback: cerca per nome esatto (case-insensitive) se il telefono non ha dato risultati
    if not client and incoming_name_lower:
        name_match = await db.clients.find_one(
            {"user_id": user_id, "name": {"$regex": f"^{re.escape(incoming_name_lower)}$", "$options": "i"}},
            {"_id": 0}
        )
        if name_match:
            client = name_match

    if client:
        client_id = client["id"]
        # Aggiorna il telefono se il cliente esistente non ce l'ha
        stored_phone = client.get("phone", "")
        if not stored_phone and data.client_phone:
            await db.clients.update_one(
                {"id": client_id, "user_id": user_id},
                {"$set": {"phone": data.client_phone}}
            )
            logger.info(f"Aggiornato telefono per cliente esistente: {client.get('name')} -> {data.client_phone}")
        logger.info(f"Cliente esistente trovato: {client.get('name')} (ID: {client_id})")
    else:
        client_id = str(uuid.uuid4())
        client = {
            "id": client_id, "user_id": user_id, "name": data.client_name,
            "phone": data.client_phone,
            "notes": f"[Online] {data.notes}" if data.notes else "[Prenotazione Online]",
            "send_sms_reminders": True, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(client)
        logger.info(f"Nuovo cliente creato: {data.client_name} ({data.client_phone})")

    services = await db.services.find({"id": {"$in": data.service_ids}, "user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(20)
    if not services:
        raise HTTPException(status_code=400, detail="Servizi non validi")

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    start_hour, start_min = map(int, data.time.split(":"))
    end_minutes = start_hour * 60 + start_min + total_duration
    end_time = f"{end_minutes // 60:02d}:{end_minutes % 60:02d}"

    assigned_operator_id = data.operator_id or None
    operator_name = None
    operator_color = None
    if assigned_operator_id:
        operator = await db.operators.find_one({"id": assigned_operator_id, "user_id": user_id}, {"_id": 0})
        if operator:
            operator_name = operator["name"]
            operator_color = operator.get("color")
    if not assigned_operator_id:
        first_op = await db.operators.find_one({"user_id": user_id, "active": True}, {"_id": 0})
        if first_op:
            assigned_operator_id = first_op["id"]
            operator_name = first_op["name"]
            operator_color = first_op.get("color")

    appointment_id = str(uuid.uuid4())
    booking_token = str(uuid.uuid4())
    appointment = {
        "id": appointment_id, "user_id": user_id, "client_id": client_id,
        "client_name": data.client_name, "service_ids": data.service_ids, "services": services,
        "operator_id": assigned_operator_id, "operator_name": operator_name, "operator_color": operator_color,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled",
        "notes": f"[Online] {data.notes}" if data.notes else "[Prenotazione Online]",
        "source": "online", "booking_token": booking_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment)

    # Notifica push all'admin per la nuova prenotazione online
    try:
        from routes.push import send_push_to_all
        services_names = ", ".join([s.get("name", "") for s in services])
        await send_push_to_all(
            title="🔔 Nuova Prenotazione Online!",
            body=f"{data.client_name} • {data.date} alle {data.time} • {services_names}",
            url="/planning",
        )
    except Exception as e:
        logger.warning(f"Push notifica prenotazione fallita: {e}")

    return {
        "success": True,
        "appointment_id": appointment_id,
        "booking_code": appointment_id[:8].upper(),
        "booking_token": booking_token,
    }



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
    result = put_object(path, data, mime_map.get(ext, "application/octet-stream"))
    
    # Store file data in MongoDB if using mongo:// fallback
    mongo_data = result.pop("_mongo_data", None)
    mongo_ct = result.pop("_content_type", None)
    
    doc = {
        "id": file_id, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": mime_map.get(ext, "application/octet-stream"), "size": result.get("size", len(data)),
        "file_type": file_type, "is_deleted": False, "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if mongo_data:
        doc["file_data"] = mongo_data
    
    await db.website_files.insert_one(doc)
    return {"id": file_id, "path": result["path"], "url": f"/api/website/files/{file_id}", "file_type": file_type}


@router.get("/website/files/{file_id}")
async def website_serve_file(file_id: str, request: Request):
    record = await db.website_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File non trovato")

    data, content_type = get_object(record["storage_path"])
    content_type = record.get("content_type", content_type)
    total_size = len(data)

    # Gestione Range requests — necessaria per la riproduzione video HTML5.
    # I browser inviano "Range: bytes=X-Y" per caricare i video progressivamente.
    range_header = request.headers.get("range")
    if range_header and content_type.startswith("video/"):
        try:
            range_val = range_header.replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            start = int(start_str)
            end = int(end_str) if end_str.strip() else total_size - 1
            end = min(end, total_size - 1)
            chunk = data[start:end + 1]
            headers = {
                "Content-Range": f"bytes {start}-{end}/{total_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
                "Cache-Control": "public, max-age=86400",
            }
            return Response(content=chunk, status_code=206, media_type=content_type, headers=headers)
        except Exception as e:
            logger.warning(f"Range parsing fallito per {file_id}: {e}")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(total_size),
        "Cache-Control": "public, max-age=86400",
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
    upselling_rules: Optional[List[Any]] = None
    upselling_discount: Optional[float] = None

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
    return {k: v for k, v in review.items() if k != "_id"}


@router.put("/website/reviews/{review_id}")
async def update_website_review(review_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.update_one(
        {"id": review_id, "user_id": current_user["id"]},
        {"$set": {"name": data.get("name"), "text": data.get("text"), "rating": data.get("rating", 5)}}
    )
    return await db.website_reviews.find_one({"id": review_id}, {"_id": 0})


@router.delete("/website/reviews/{review_id}")
async def delete_website_review(review_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_reviews.delete_one({"id": review_id, "user_id": current_user["id"]})
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
    return {k: v for k, v in item.items() if k != "_id"}


@router.put("/website/gallery/{item_id}")
async def update_website_gallery_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update_data = {}
    for key in ["label", "tag", "sort_order", "section", "image_url"]:
        if key in data:
            update_data[key] = data[key]
    if update_data:
        await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": update_data})
    return await db.website_gallery.find_one({"id": item_id}, {"_id": 0})


@router.delete("/website/gallery/{item_id}")
async def delete_website_gallery_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.website_gallery.update_one({"id": item_id, "user_id": current_user["id"]}, {"$set": {"is_deleted": True}})
    return {"success": True}


@router.get("/public/website")
async def public_get_website():
    user = await get_public_admin_user()
    config = await db.website_config.find_one({"user_id": user["id"]} if user else {}, {"_id": 0, "user_id": 0})
    if not config:
        config = {k: v for k, v in DEFAULT_WEBSITE_CONFIG.items()}
    else:
        config = {**DEFAULT_WEBSITE_CONFIG, **{k: v for k, v in config.items() if k != "user_id"}}
    reviews = await db.website_reviews.find({"user_id": user["id"]} if user else {}, {"_id": 0, "user_id": 0}).to_list(100)
    gallery = await db.website_gallery.find({"user_id": user["id"], "is_deleted": {"$ne": True}} if user else {"is_deleted": {"$ne": True}}, {"_id": 0, "user_id": 0}).sort("sort_order", 1).to_list(100)
    services = await db.services.find({"user_id": user["id"]} if user else {}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Card templates for public booking
    card_templates_raw = await db.card_templates.find({"user_id": user["id"], "is_deleted": {"$ne": True}} if user else {"is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100)
    card_templates = []
    for ct in card_templates_raw:
        card_templates.append({
            "id": ct.get("id", ""),
            "name": ct.get("name", ""),
            "card_type": ct.get("card_type", ""),
            "total_value": ct.get("total_value", 0),
            "total_services": ct.get("total_services", 0),
            "duration_months": ct.get("duration_months", 0),
            "notes": ct.get("notes", ""),
        })

    # Loyalty program info for public display - use same admin user as public services
    from models import get_loyalty_rewards, LOYALTY_POINTS_PER_EURO
    admin_user_id = user["id"] if user else ""
    loyalty_rewards_data = await get_loyalty_rewards(admin_user_id)
    loyalty_config = {
        "points_per_euro": LOYALTY_POINTS_PER_EURO,
        "rewards": loyalty_rewards_data
    }
    
    return {"config": config, "reviews": reviews, "gallery": gallery, "services": services, "card_templates": card_templates, "loyalty": loyalty_config}


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
