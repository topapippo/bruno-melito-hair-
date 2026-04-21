from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from typing import List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from auth import get_current_user, hash_password, verify_password, create_token
from models import UserCreate, UserLogin, UserResponse, TokenResponse, ChangePasswordRequest

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Rate limiting su MongoDB (funziona con Gunicorn multi-worker) ─────────────
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900  # 15 minuti


async def _check_rate_limit(ip: str):
    """Conta i tentativi di login falliti per IP negli ultimi 5 minuti tramite MongoDB.
    Condiviso tra tutti i worker — resistente a riavvii del server."""
    window_start = datetime.now(timezone.utc) - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    count = await db.login_attempts.count_documents({
        "ip": ip,
        "ts": {"$gte": window_start.isoformat()}
    })
    if count >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi di login. Riprova tra {LOGIN_WINDOW_SECONDS // 60} minuti.",
            headers={"Retry-After": str(LOGIN_WINDOW_SECONDS)},
        )
    await db.login_attempts.insert_one({
        "ip": ip,
        "ts": datetime.now(timezone.utc).isoformat()
    })
    # Pulizia asincrona dei record vecchi (non bloccante)
    await db.login_attempts.delete_many({
        "ts": {"$lt": window_start.isoformat()}
    })


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
        {"name": "Piega", "category": "taglio", "duration": 30, "price": 25.0},
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



def _infer_category(name: str) -> str:
    """Infer service category from its name using keyword matching."""
    n = name.lower()
    if any(k in n for k in ["colore", "meches", "tinta", "shatush", "balayage", "decoloraz", "rifless", "copertura"]):
        return "colore"
    if any(k in n for k in ["permanente", "arricciatura", "ondulazione"]):
        return "permanente"
    if any(k in n for k in ["stiratura", "lisciatura", "lisciante"]):
        return "stiratura"
    if any(k in n for k in ["trattamento", "cheratina", "ricostruz", "maschera", "ristruttur", "olaplex", "botox"]):
        return "trattamento"
    if any(k in n for k in ["taglio", "piega", "rasatura", "sfumatura", "barba", "spuntat", "messa in piega", "finish", "asciugatura", "piastra", "arricciacapelli"]):
        return "taglio"
    if any(k in n for k in ["abbonamento", "pacchetto", "tessera"]):
        return "abbonamento"
    return "altro"


async def _repair_categories(user_id: str):
    """Background task: fill empty categories on master services AND appointment embedded services.
    Viene eseguita una sola volta per utente (flag categories_repaired nel documento utente)."""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "categories_repaired": 1})
        if user and user.get("categories_repaired"):
            return  # già eseguita, nessuna azione

        # Step 1: Repair master services that have no category (only empty ones)
        master = await db.services.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
        for svc in master:
            if not svc.get("category"):
                inferred = _infer_category(svc.get("name", ""))
                await db.services.update_one({"id": svc["id"]}, {"$set": {"category": inferred}})
                svc["category"] = inferred

        # Build lookup maps from master list
        by_id = {s["id"]: s.get("category", "") for s in master}

        # Step 2: Fill empty categories on appointment embedded services
        appointments = await db.appointments.find({"user_id": user_id}, {"_id": 0, "id": 1, "services": 1}).to_list(10000)
        patched = 0
        for apt in appointments:
            updated = False
            for svc in (apt.get("services") or []):
                if not svc.get("category"):
                    svc["category"] = by_id.get(svc.get("id", ""), "") or _infer_category(svc.get("name", ""))
                    updated = True
            if updated:
                await db.appointments.update_one({"id": apt["id"]}, {"$set": {"services": apt["services"]}})
                patched += 1

        # Segna come completata per non rieseguire ad ogni login
        await db.users.update_one({"id": user_id}, {"$set": {"categories_repaired": True}})
        logger.info(f"Auto-repair categorie: {patched} appuntamenti aggiornati per user {user_id}")
    except Exception as e:
        logger.error(f"Errore auto-repair categorie: {e}")


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, background_tasks: BackgroundTasks):
    client_ip = request.client.host if request.client else "unknown"
    await _check_rate_limit(client_ip)

    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Messaggio generico per non rivelare se l'email esiste
    if not user or not verify_password(data.password, user["password"]):
        logger.warning(f"Tentativo login fallito per: {data.email} da IP: {client_ip}")
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    logger.info(f"Login riuscito per: {data.email}")
    token = create_token(user["id"])

    # Auto-repair: patch category on old appointments in background
    background_tasks.add_task(_repair_categories, user["id"])

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
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 8 caratteri")
    user = await db.users.find_one({"id": current_user["id"]})
    if not user or not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Password corrente non corretta")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hash_password(data.new_password)}}
    )
    logger.info(f"Password aggiornata per utente: {current_user['email']}")
    return {"success": True, "message": "Password aggiornata con successo"}

# ── Fine routes auth ──
