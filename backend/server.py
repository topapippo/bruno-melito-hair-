from fastapi import FastAPI, Request, Response  # noqa
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
    # (Storage file: ora su GridFS/MongoDB, nessuna init esterna necessaria.)

    # Crea indici MongoDB per performance
    try:
        await db.appointments.create_index([("user_id", 1), ("date", 1)])
        await db.appointments.create_index([("user_id", 1), ("date", 1), ("status", 1)])
        await db.appointments.create_index([("user_id", 1), ("client_id", 1)])
        await db.appointments.create_index([("user_id", 1), ("status", 1)])
        await db.clients.create_index([("user_id", 1), ("name", 1)])
        await db.clients.create_index([("user_id", 1)])
        await db.clients.create_index([("id", 1), ("user_id", 1)])
        await db.services.create_index([("user_id", 1)])
        await db.operators.create_index([("user_id", 1)])
        await db.payments.create_index([("user_id", 1), ("date", 1)])
        await db.payments.create_index([("user_id", 1), ("payment_method", 1)])
        await db.cards.create_index([("user_id", 1), ("active", 1)])
        await db.cards.create_index([("id", 1), ("user_id", 1)])
        await db.loyalty.create_index([("client_id", 1), ("user_id", 1)])
        await db.reminders_sent.create_index([("user_id", 1), ("type", 1)])
        await db.users.create_index([("email", 1)], unique=True)
        await db.waitlist.create_index([("user_id", 1), ("status", 1)])
        # Indice TTL: pulisce automaticamente i tentativi di login vecchi dopo 15 minuti
        await db.login_attempts.create_index([("ip", 1)])
        try:
            await db.login_attempts.drop_index("ts_1")
        except Exception:
            pass
        await db.login_attempts.create_index("ts", expireAfterSeconds=900)
        # Indice TTL: pulisce i tentativi di registrazione dopo 24 ore
        await db.register_attempts.create_index([("ip", 1)])
        await db.register_attempts.create_index("ts", expireAfterSeconds=86400)
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

    # Migrazione: Aggiorna colori tema admin al nuovo default "Viola Fest"
    # Colpisce SOLO chi ha ancora i vecchi palette — non sovrascrive temi personalizzati
    try:
        old_primaries = ["#C8617A", "#c8617a", "#B45309", "#b45309", "#E8477C", "#e8477c"]
        result = await db.users.update_many(
            {"admin_theme.primary": {"$in": old_primaries}},
            {"$set": {
                "admin_theme.primary": "#A855F7",
                "admin_theme.sidebar_bg": "#12053A",
                "admin_theme.sidebar_text": "#FAF5FF",
                "admin_theme.accent": "#FBBF24",
                "admin_theme.content_bg": "#FAF5FF",
                "admin_theme.content_text": "#12053A"
            }}
        )
        if result.modified_count > 0:
            logger.info(f"Migrazione tema Viola Fest: {result.modified_count} utenti aggiornati")
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
        from utils import send_automatic_message
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
                    tomorrow_dt = datetime.now(timezone.utc) + timedelta(days=1)
                    tomorrow = tomorrow_dt.strftime("%Y-%m-%d")
                    tomorrow_it = tomorrow_dt.strftime("%d/%m/%Y")
                    # Manda promemoria per TUTTI gli appuntamenti di domani (online + manuali),
                    # purché non sia già stato inviato
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
                        token = str(uuid.uuid4())
                        confirm_link = f"{FRONTEND_URL}/conferma/{token}"
                        services_text = ", ".join([s["name"] for s in apt.get("services", [])])
                        fallback_msg = (
                            f"Ciao {apt.get('client_name', '')}! Ti ricordiamo l'appuntamento di domani "
                            f"({tomorrow_it}) alle {apt['time']} per {services_text}.\n\n"
                            f"Conferma o disdici qui: {confirm_link}"
                        )
                        result = await send_automatic_message(
                            client_phone,
                            template_name="promemoria_appuntamento",
                            template_vars=[apt.get('client_name', 'Cliente'), tomorrow_it, apt['time']],
                            fallback_text=fallback_msg,
                            user=user,
                        )
                        if result.get("sent"):
                            await db.appointments.update_one(
                                {"id": apt["id"]},
                                {"$set": {
                                    "confirmation_token": token,
                                    "confirmation_status": "pending",
                                    "confirmation_sent_at": datetime.now(timezone.utc).isoformat(),
                                    "confirmation_method": result.get("method", "whatsapp"),
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

    # Scheduler riprenotazione e inattivi — disabilitati, troppi messaggi automatici

    # Check env vars critiche e logga warning se mancanti
    missing_vars = []
    for var in ["FRONTEND_URL", "PUBLIC_ADMIN_EMAIL", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]:
        if not os.environ.get(var):
            missing_vars.append(var)
    if missing_vars:
        logger.warning(f"Env var non configurate: {', '.join(missing_vars)} — alcune funzionalità potrebbero non funzionare correttamente")

    # Scheduler compleanno — disabilitato, troppi messaggi automatici

    # Scalda la cache del sito pubblico all'avvio (evita cold start visibile agli utenti)
    try:
        from routes.public import public_get_website
        await public_get_website()
        logger.info("Cache sito pubblico scaldata all'avvio")
    except Exception as e:
        logger.warning(f"Warmup cache sito: {e}")

    yield

    # Shutdown
    mongo_client.close()
    logger.info("Connessione MongoDB chiusa")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="MBHS SALON API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── Security Headers ───────────────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ───────────────────────────────────────────────────────────────────────
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
_env_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()] if _cors_origins_raw else []

# Origini sempre permesse: sviluppo locale + frontend produzione di questo progetto.
# Servono come safety-net se CORS_ORIGINS su Render viene resettata o scritta male.
_always_allowed = [
    "http://localhost:3000",
    "https://bruno-melito-hair.onrender.com",
    "https://brunomelitohair.it",
    "https://www.brunomelitohair.it",
]
cors_origins = list(dict.fromkeys(_env_origins + _always_allowed))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Regex copre eventuali preview/branch deploy di Render (es. brunomelito-pr-N.onrender.com)
    allow_origin_regex=r"https://([a-z0-9-]+\.)?(brunomelitohair\.it|bruno-melito-hair[-a-z0-9]*\.onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler globale: FastAPI di default ritorna 500 SENZA header CORS
# per eccezioni non gestite, e il browser blocca tutto come "CORS error".
# Qui catturiamo tutto e attacchiamo manualmente l'header allow-origin
# in modo che il frontend possa leggere il messaggio di errore reale.
import traceback as _tb_module
from fastapi.responses import JSONResponse as _JSONResponse


def _cors_origin_for(request: Request) -> str:
    origin = request.headers.get("origin", "")
    if not origin:
        return ""
    if origin in cors_origins:
        return origin
    import re as _re_mod
    if _re_mod.match(r"https://([a-z0-9-]+\.)?(brunomelitohair\.it|bruno-melito-hair[-a-z0-9]*\.onrender\.com)", origin):
        return origin
    return ""


@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    tb_str = _tb_module.format_exc()
    logger.error(f"[UNHANDLED] {request.method} {request.url.path} → {type(exc).__name__}: {exc}\n{tb_str}")
    headers = {}
    allowed_origin = _cors_origin_for(request)
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"
    return _JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)[:300]}"},
        headers=headers,
    )

# ── Routes ─────────────────────────────────────────────────────────────────────
from fastapi import APIRouter

# Health/warmup endpoints BEFORE /api prefix (Render/UptimeRobot need these at root)
@app.get("/health")
@app.head("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/health")
@app.head("/api/health")
async def api_health_check():
    return {"status": "ok"}

@app.get("/api/warmup")
@app.head("/api/warmup")
async def api_warmup_check():
    return {"status": "warming", "ok": True}

@app.get("/ping")
@app.head("/ping")
async def ping_check():
    return {"status": "pong"}

@app.get("/api/ping")
@app.head("/api/ping")
async def api_ping_check():
    return {"status": "pong"}

# Main API router with all other routes
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "Salone Parrucchiera API", "status": "ok"}

# Mount all routers under /api
for router in all_routers:
    api_router.include_router(router)

app.include_router(api_router)
