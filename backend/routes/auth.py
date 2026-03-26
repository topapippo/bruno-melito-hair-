from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from datetime import datetime, timezone
from collections import defaultdict
import uuid
import time
import logging

from database import db
from auth import get_current_user, hash_password, verify_password, create_token
from models import UserCreate, UserLogin, UserResponse, TokenResponse, ChangePasswordRequest

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Rate limiting semplice in memoria (per brute-force su login) ──────────────
_login_attempts: dict = defaultdict(list)
LOGIN_MAX_ATTEMPTS = 10
LOGIN_WINDOW_SECONDS = 300  # 5 minuti


def _check_rate_limit(ip: str):
    now = time.time()
    attempts = _login_attempts[ip]
    # Rimuovi tentativi vecchi
    _login_attempts[ip] = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]
    if len(_login_attempts[ip]) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi di login. Riprova tra {LOGIN_WINDOW_SECONDS // 60} minuti."
        )
    _login_attempts[ip].append(now)


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "salon_name": data.salon_name,
        "opening_time": "09:00",
        "closing_time": "19:00",
        "working_days": ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.users.insert_one(user_doc)

    default_services = [
        {"name": "Taglio Donna", "category": "taglio", "duration": 45, "price": 35.0},
        {"name": "Piega", "category": "piega", "duration": 30, "price": 25.0},
        {"name": "Colore", "category": "colore", "duration": 90, "price": 60.0},
        {"name": "Meches", "category": "colore", "duration": 120, "price": 80.0},
        {"name": "Trattamento Ristrutturante", "category": "trattamento", "duration": 30, "price": 30.0},
        {"name": "Shampoo", "category": "altro", "duration": 10, "price": 5.0},
    ]

    for svc in default_services:
        service_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **svc,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.services.insert_one(service_doc)

    operator_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": data.name,
        "phone": "",
        "color": "#C58970",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.operators.insert_one(operator_doc)

    logger.info(f"Nuovo utente registrato: {data.email}")
    token = create_token(user_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, email=data.email, name=data.name,
            salon_name=data.salon_name, created_at=user_doc["created_at"]
        )
    )


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Messaggio generico per non rivelare se l'email esiste
    if not user or not verify_password(data.password, user["password"]):
        logger.warning(f"Tentativo login fallito per: {data.email} da IP: {client_ip}")
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    logger.info(f"Login riuscito per: {data.email}")
    token = create_token(user["id"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            salon_name=user["salon_name"], created_at=user["created_at"]
        )
    )


# ── Me ────────────────────────────────────────────────────────────────────────
@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"], email=current_user["email"],
        name=current_user["name"], salon_name=current_user["salon_name"],
        created_at=current_user["created_at"]
    )


# ── Change Password ───────────────────────────────────────────────────────────
@router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 6 caratteri")
    user = await db.users.find_one({"id": current_user["id"]})
    if not user or not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Password corrente non corretta")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(data.new_password)}}
    )
    logger.info(f"Password aggiornata per utente: {current_user['email']}")
    return {"success": True, "message": "Password aggiornata con successo"}


# ── Admin Password Reset (protetto da chiave segreta) ─────────────────────────
@router.post("/auth/admin-reset")
async def admin_reset_password(request: Request):
    body = await request.json()
    secret = body.get("secret")
    email = body.get("email")
    new_password = body.get("new_password")
    if secret != "mbhs-admin-reset-2024-secure":
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if not email or not new_password:
        raise HTTPException(status_code=400, detail="Email e new_password richiesti")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": hash_password(new_password)}}
    )
    return {"success": True, "message": f"Password resettata per {email}"}


# ── Trasferimento dati tra utenti (protetto da chiave segreta) ────────────────
@router.post("/auth/admin-transfer-data")
async def admin_transfer_data(request: Request):
    body = await request.json()
    secret = body.get("secret")
    from_email = body.get("from_email")
    to_email = body.get("to_email")
    if secret != "mbhs-admin-reset-2024-secure":
        raise HTTPException(status_code=403, detail="Non autorizzato")

    from_user = await db.users.find_one({"email": from_email}, {"_id": 0})
    to_user = await db.users.find_one({"email": to_email}, {"_id": 0})
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="Uno o entrambi gli utenti non trovati")

    from_id = from_user["id"]
    to_id = to_user["id"]
    results = {}

    collections = ["clients", "services", "operators", "appointments", "cards",
                    "payments", "loyalty", "expenses", "promotions", "website_config",
                    "admin_themes", "blocked_slots", "push_subscriptions", "reminders"]

    for coll_name in collections:
        coll = db[coll_name]
        result = await coll.update_many(
            {"user_id": from_id},
            {"$set": {"user_id": to_id}}
        )
        results[coll_name] = result.modified_count

    # Copy user settings (opening_time, closing_time, working_days)
    settings_fields = {k: v for k, v in from_user.items()
                       if k in ("opening_time", "closing_time", "working_days", "salon_name")}
    if settings_fields:
        await db.users.update_one({"id": to_id}, {"$set": settings_fields})

    return {"success": True, "from": from_email, "to": to_email, "transferred": results}
