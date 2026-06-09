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
    except: pass

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
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {str(exc)}\n{traceback.format_exc()}")
    # Aggiungiamo gli header CORS manualmente nella risposta di errore
    headers = {
        "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
        "Access-Control-Allow-Credentials": "true",
    }
    return JSONResponse(
        status_code=500,
        content={"detail": "Errore interno del server", "msg": str(exc)},
        headers=headers
    )

# --- 4. MIDDLEWARES ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
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
