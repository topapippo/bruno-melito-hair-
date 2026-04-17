from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging
import os
import uuid

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from database import client as mongo_client, db
from routes import all_routers

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

logger = logging.getLogger(__name__)

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ── Lifespan (sostituisce i deprecati on_event) ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        from routes.public import init_storage
        init_storage()
        logger.info("Object storage inizializzato")
    except Exception as e:
        logger.warning(f"Object storage init rinviato: {e}")

    # Crea indici MongoDB per performance
    try:
        await db.appointments.create_index([("user_id", 1), ("date", 1)])
        await db.appointments.create_index([("user_id", 1), ("client_id", 1)])
        await db.appointments.create_index([("user_id", 1), ("status", 1)])
        await db.clients.create_index([("user_id", 1), ("name", 1)])
        await db.clients.create_index([("user_id", 1)])
        await db.services.create_index([("user_id", 1)])
        await db.operators.create_index([("user_id", 1)])
        await db.payments.create_index([("user_id", 1), ("date", 1)])
        await db.loyalty.create_index([("client_id", 1), ("user_id", 1)])
        await db.users.create_index([("email", 1)], unique=True)
        # Indice TTL: pulisce automaticamente i tentativi di login vecchi dopo 10 minuti
        await db.login_attempts.create_index([("ip", 1)])
        await db.login_attempts.create_index("ts", expireAfterSeconds=600)
        logger.info("Indici MongoDB creati/verificati")
    except Exception as e:
        logger.error(f"Errore creazione indici MongoDB: {e}")

    # Rimuovi indice unico su clients (user_id, name) se esiste — impediva nomi duplicati
    try:
        indexes = await db.clients.index_information()
        for idx_name, idx_info in indexes.items():
            if idx_info.get('unique') and idx_info.get('key') == [('user_id', 1), ('name', 1)]:
                await db.clients.drop_index(idx_name)
                logger.info(f"Rimosso indice unico {idx_name} su clients")
    except Exception as e:
        logger.warning(f"Pulizia indici clients: {e}")

    # Migrazione: sposta servizi "piega" nella categoria "taglio" (Styling)
    try:
        result = await db.services.update_many(
            {"category": "piega"},
            {"$set": {"category": "taglio"}}
        )
        if result.modified_count > 0:
            logger.info(f"Migrazione: {result.modified_count} servizi piega spostati in Styling")
    except Exception as e:
        logger.warning(f"Migrazione piega->taglio: {e}")

    # Migrazione: Aggiunge premi fedeltà mancanti senza sovrascrivere quelli personalizzati
    try:
        from models import DEFAULT_LOYALTY_REWARDS
        # Usa cursor per gestire più di 100 utenti
        async for user in db.users.find({}, {"_id": 0, "id": 1}):
            uid = user["id"]
            existing_keys = set()
            async for r in db.loyalty_rewards.find({"user_id": uid}, {"_id": 0, "key": 1}):
                existing_keys.add(r["key"])
            inserted = 0
            for key, reward in DEFAULT_LOYALTY_REWARDS.items():
                if key not in existing_keys:
                    doc = {**reward, "key": key, "user_id": uid}
                    await db.loyalty_rewards.insert_one(doc)
                    inserted += 1
            if inserted:
                logger.info(f"Premi fedeltà: aggiunti {inserted} nuovi premi per utente {uid}")
    except Exception as e:
        logger.warning(f"Migrazione premi fedeltà: {e}")

    # Migrazione: Aggiorna colori tema admin al nuovo palette "Vivace Bloom"
    try:
        old_primaries = ["#C8617A", "#c8617a", "#B45309", "#b45309"]
        result = await db.users.update_many(
            {"$or": [
                {"admin_theme.primary": {"$in": old_primaries}},
                {"admin_theme.primary": {"$exists": True, "$nin": ["#E8477C"]}}
            ]},
            {"$set": {
                "admin_theme.primary": "#E8477C",
                "admin_theme.sidebar_bg": "#FAFBFC",
                "admin_theme.sidebar_text": "#1A1A2E",
                "admin_theme.accent": "#2EC4B6",
                "admin_theme.content_bg": "#FCFCFD",
                "admin_theme.content_text": "#1A1A2E"
            }}
        )
        if result.modified_count > 0:
            logger.info(f"Migrazione tema: {result.modified_count} utenti aggiornati al nuovo palette")
    except Exception as e:
        logger.warning(f"Migrazione tema: {e}")

    # Start push notification scheduler
    import asyncio
    try:
        from routes.push import _send_push_reminders_core
        async def push_reminder_loop():
            while True:
                try:
                    await _send_push_reminders_core()
                except Exception as e:
                    logger.error(f"Push reminder error: {e}")
                await asyncio.sleep(3600)
        asyncio.ensure_future(push_reminder_loop())
        logger.info("Push notification scheduler avviato")
    except Exception as e:
        logger.warning(f"Push scheduler non avviato: {e}")

    # Scheduler conferme appuntamenti automatiche (ogni giorno alle 14:00 UTC = 16:00 Italia)
    try:
        from utils import send_sms_reminder
        CONFIRMATION_HOUR_UTC = int(os.environ.get("CONFIRMATION_HOUR_UTC", "14"))
        FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://brunomelitohair.it")

        async def confirmation_loop():
            while True:
                now = datetime.now(timezone.utc)
                next_run = now.replace(hour=CONFIRMATION_HOUR_UTC, minute=0, second=0, microsecond=0)
                if now >= next_run:
                    next_run += timedelta(days=1)
                wait_seconds = (next_run - now).total_seconds()
                logger.info(f"Prossima conferma automatica in {wait_seconds / 3600:.1f}h")
                await asyncio.sleep(wait_seconds)
                try:
                    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
                    appointments = await db.appointments.find(
                        {"date": tomorrow, "status": {"$nin": ["cancelled"]},
                         "confirmation_sent_at": {"$exists": False}},
                        {"_id": 0}
                    ).to_list(500)
                    sent_count = 0
                    for apt in appointments:
                        client_phone = apt.get("client_phone", "")
                        if not client_phone and apt.get("client_id"):
                            cl = await db.clients.find_one({"id": apt["client_id"]}, {"_id": 0})
                            if cl:
                                client_phone = cl.get("phone", "")
                        if not client_phone:
                            continue
                        user = await db.users.find_one({"id": apt["user_id"]}, {"_id": 0})
                        salon_name = user.get("salon_name", "Salone") if user else "Salone"
                        token = str(uuid.uuid4())
                        confirm_link = f"{FRONTEND_URL}/conferma/{token}"
                        services_text = ", ".join([s["name"] for s in apt.get("services", [])])
                        message = (
                            f"Ciao {apt.get('client_name', '')}! Ti ricordiamo l'appuntamento di domani "
                            f"alle {apt['time']} per {services_text}. "
                            f"Conferma o disdici: {confirm_link}"
                        )
                        result = await send_sms_reminder(client_phone, message, salon_name)
                        if result.get("success"):
                            await db.appointments.update_one(
                                {"id": apt["id"]},
                                {"$set": {
                                    "confirmation_token": token,
                                    "confirmation_status": "pending",
                                    "confirmation_sent_at": datetime.now(timezone.utc).isoformat(),
                                    "sms_sent": True,
                                }}
                            )
                            sent_count += 1
                    logger.info(f"Conferme automatiche inviate: {sent_count}/{len(appointments)}")
                except Exception as e:
                    logger.error(f"Errore scheduler conferme: {e}")

        asyncio.ensure_future(confirmation_loop())
        logger.info(f"Scheduler conferme appuntamenti avviato (ogni giorno alle {CONFIRMATION_HOUR_UTC:02d}:00 UTC)")
    except Exception as e:
        logger.warning(f"Scheduler conferme non avviato: {e}")

    # Start backup serale (ore 20:00 Italia = 19:00 UTC)
    try:
        from routes.backup import run_backup
        BACKUP_HOUR_UTC = int(os.environ.get("BACKUP_HOUR_UTC", "19"))

        async def backup_loop():
            while True:
                now = datetime.now(timezone.utc)
                # Calcola il prossimo orario target
                next_run = now.replace(
                    hour=BACKUP_HOUR_UTC, minute=0, second=0, microsecond=0
                )
                if now >= next_run:
                    next_run += timedelta(days=1)
                wait_seconds = (next_run - now).total_seconds()
                logger.info(
                    f"Prossimo backup serale in {wait_seconds / 3600:.1f}h "
                    f"(alle {next_run.strftime('%Y-%m-%d %H:%M')} UTC)"
                )
                await asyncio.sleep(wait_seconds)
                try:
                    await run_backup()
                except Exception as e:
                    logger.error(f"Errore backup serale: {e}")

        asyncio.ensure_future(backup_loop())
        logger.info(f"Backup serale scheduler avviato (ogni giorno alle {BACKUP_HOUR_UTC:02d}:00 UTC)")
    except Exception as e:
        logger.warning(f"Backup scheduler non avviato: {e}")

    # Check env vars critiche e logga warning se mancanti
    missing_vars = []
    for var in ["FRONTEND_URL", "PUBLIC_ADMIN_EMAIL", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]:
        if not os.environ.get(var):
            missing_vars.append(var)
    if missing_vars:
        logger.warning(f"Env var non configurate: {', '.join(missing_vars)} — alcune funzionalità potrebbero non funzionare correttamente")

    # Scheduler auguri compleanno automatici (ogni giorno alle 9:00 UTC = 11:00 Italia)
    try:
        BIRTHDAY_HOUR_UTC = int(os.environ.get("BIRTHDAY_HOUR_UTC", "9"))

        async def birthday_loop():
            while True:
                now = datetime.now(timezone.utc)
                next_run = now.replace(hour=BIRTHDAY_HOUR_UTC, minute=0, second=0, microsecond=0)
                if now >= next_run:
                    next_run += timedelta(days=1)
                await asyncio.sleep((next_run - now).total_seconds())
                try:
                    today = datetime.now(timezone.utc)
                    today_mm_dd = today.strftime("%m-%d")
                    clients = await db.clients.find(
                        {"birthday": {"$regex": f"(^{today_mm_dd}$|{today_mm_dd}$)"}},
                        {"_id": 0}
                    ).to_list(500)
                    for client in clients:
                        already = await db.reminders_sent.find_one({
                            "type": "birthday", "client_id": client["id"],
                            "date": today.strftime("%Y-%m-%d")
                        })
                        if already or not client.get("phone"):
                            continue
                        user = await db.users.find_one({"id": client.get("user_id")}, {"_id": 0})
                        salon_name = user.get("salon_name", "Bruno Melito Hair") if user else "Bruno Melito Hair"
                        from utils import send_sms_reminder
                        msg = f"Ciao {client['name']}! Tanti auguri di Buon Compleanno! 🎂 Il team di {salon_name} ti augura una splendida giornata. Ti aspettiamo presto!"
                        result = await send_sms_reminder(client["phone"], msg, salon_name)
                        if result.get("success"):
                            await db.reminders_sent.insert_one({
                                "id": str(uuid.uuid4()), "user_id": client.get("user_id"),
                                "type": "birthday", "client_id": client["id"],
                                "date": today.strftime("%Y-%m-%d"),
                                "sent_at": today.isoformat()
                            })
                            logger.info(f"Auguri compleanno inviati a {client['name']}")
                except Exception as e:
                    logger.error(f"Errore scheduler compleanno: {e}")

        asyncio.ensure_future(birthday_loop())
        logger.info(f"Scheduler auguri compleanno avviato (ogni giorno alle {BIRTHDAY_HOUR_UTC:02d}:00 UTC)")
    except Exception as e:
        logger.warning(f"Scheduler compleanno non avviato: {e}")

    yield

    # Shutdown
    mongo_client.close()
    logger.info("Connessione MongoDB chiusa")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="MBHS SALON API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────────
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if _cors_origins_raw:
    cors_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()]
else:
    # "*" + allow_credentials=True è vietato dalle specifiche CORS e bloccato dai browser.
    # In sviluppo usiamo l'origine locale; in produzione impostare CORS_ORIGINS.
    cors_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Salone Parrucchiera API", "status": "ok"}

@api_router.get("/health")
@api_router.head("/health")
async def health():
    return {"status": "alive"}

for router in all_routers:
    api_router.include_router(router)

app.include_router(api_router)
