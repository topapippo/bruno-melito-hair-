from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from database import client as mongo_client, db
from routes import all_routers

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
        logger.info("Indici MongoDB creati/verificati")
    except Exception as e:
        logger.error(f"Errore creazione indici MongoDB: {e}")

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

    yield

    # Shutdown
    mongo_client.close()
    logger.info("Connessione MongoDB chiusa")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="MBHS SALON API", lifespan=lifespan)

# ── CORS ───────────────────────────────────────────────────────────────────────
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if _cors_origins_raw:
    cors_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()]
else:
    cors_origins = ["*"]

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
