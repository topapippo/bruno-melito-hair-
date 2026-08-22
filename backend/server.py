from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
import logging
import os
import asyncio
import traceback

from database import client as mongo_client, db
from routes import all_routers
from scheduler import run_scheduler

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    try:
        from routes.public import public_get_website
        asyncio.create_task(public_get_website())
    except Exception as e:
        logger.warning(f"Warm-up cache sito pubblico non avviato: {e}")

    # Avvia lo scheduler per i post social programmati
    try:
        asyncio.create_task(run_scheduler())
        logger.info("Social posts scheduler avviato")
    except Exception as e:
        logger.warning(f"Social posts scheduler non avviato: {e}")

    # Migrazione una tantum: rimuove l'account "preview" residuo melitobruno@gmail.com.
    # La produzione usa admin@brunomelito.it. SICUREZZA: si ferma se l'account possiede
    # QUALSIASI dato di business reale (impossibile perdere dati). I documenti solo di
    # servizio/auto-generati (loyalty_rewards di default, ecc.) vengono ripuliti insieme.
    try:
        ghost = await db.users.find_one({"email": "melitobruno@gmail.com"}, {"_id": 0, "id": 1})
        if ghost:
            uid = ghost["id"]
            real = ("clients", "services", "appointments", "operators", "cards",
                    "card_templates", "payments", "expenses", "promotions",
                    "website_reviews", "website_gallery", "waitlist")
            owned = 0
            for coll in real:
                owned += await db[coll].count_documents({"user_id": uid})
                if owned:
                    break
            if owned == 0:
                aux = ("loyalty_rewards", "loyalty", "website_config",
                       "blocked_slots", "reminders_sent", "communication_logs")
                for coll in aux:
                    try:
                        await db[coll].delete_many({"user_id": uid})
                    except Exception:
                        pass
                await db.users.delete_one({"id": uid})
                logger.info("Migrazione: rimosso account vuoto melitobruno@gmail.com (+ doc di servizio)")
            else:
                logger.warning(f"melitobruno@gmail.com NON rimosso: possiede dati reali ({owned}+ doc)")
    except Exception as e:
        logger.warning(f"Migrazione rimozione melitobruno: {e}")

    # Creazione indici MongoDB (approvata da Bruno). Idempotente: create_index
    # non fa nulla se l'indice esiste già con le stesse opzioni. Ogni indice è
    # racchiuso in un try/except separato così un eventuale fallimento (es.
    # email duplicate che impediscono l'indice unique) non blocca l'avvio
    # del server né gli altri indici.
    try:
        await db.users.create_index("email", unique=True)
        logger.info("Indice creato/verificato: users.email (unique)")
    except Exception as e:
        logger.warning(f"Indice users.email non creato: {e}")

    try:
        await db.appointments.create_index([("user_id", 1), ("date", 1)])
        logger.info("Indice creato/verificato: appointments.user_id_1_date_1")
    except Exception as e:
        logger.warning(f"Indice appointments (user_id, date) non creato: {e}")

    try:
        await db.payments.create_index([("user_id", 1), ("date", 1)])
        logger.info("Indice creato/verificato: payments.user_id_1_date_1")
    except Exception as e:
        logger.warning(f"Indice payments (user_id, date) non creato: {e}")

    try:
        await db.clients.create_index("user_id")
        logger.info("Indice creato/verificato: clients.user_id")
    except Exception as e:
        logger.warning(f"Indice clients.user_id non creato: {e}")

    yield
    # Shutdown
    mongo_client.close()

app = FastAPI(title="MBHS SALON API", lifespan=lifespan)

# --- 1. HEALTH CHECKS (Root level for Render/UptimeRobot) ---
@app.get("/health")
@app.head("/health")
@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/warmup")
@app.head("/api/warmup")
async def warmup_check():
    return {"status": "warming", "ok": True}

# --- 2. CORS (Permissive but secure) ---
cors_origins = [
    "http://localhost:3000",
    "https://bruno-melito-hair.onrender.com",
    "https://bruno-melito-hair-frontend.onrender.com",
    "https://brunomelitohair.it",
    "https://www.brunomelitohair.it",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.onrender\.com", # Permetti tutti i sottodomini onrender
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. GLOBAL EXCEPTION HANDLER (Prevents Network Error on 500) ---
import re as _re
_cors_origin_re = _re.compile(r"https://.*\.onrender\.com")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {str(exc)}\n{traceback.format_exc()}")
    origin = request.headers.get("origin", "")
    allowed = origin if (origin in cors_origins or _cors_origin_re.fullmatch(origin)) else ""
    headers: dict = {"Access-Control-Allow-Credentials": "true"}
    if allowed:
        headers["Access-Control-Allow-Origin"] = allowed
    return JSONResponse(
        status_code=500,
        content={"detail": "Errore interno del server"},
        headers=headers
    )

# --- 4. MIDDLEWARES ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# --- 5. ROUTES ---
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def api_root():
    return {"message": "Salone Parrucchiera API", "status": "ok"}

# Mount all feature routers
for router in all_routers:
    api_router.include_router(router)

app.include_router(api_router)