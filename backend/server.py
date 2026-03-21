from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from database import client as mongo_client
from routes import all_routers

# Create app
app = FastAPI(title="MBHS SALON API")

# Health check endpoint at root for Render
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "MBHS Salon API is running"}

# API Router with /api prefix
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Salone Parrucchiera API", "status": "ok"}


# Include all route modules
for router in all_routers:
    api_router.include_router(router)

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()


@app.on_event("startup")
async def startup_event():
    try:
        from routes.public import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init deferred: {e}")

    # Start background push reminder scheduler
    import asyncio
    async def push_reminder_loop():
        while True:
            try:
                await asyncio.sleep(3600)  # every hour
                from routes.push import send_push_reminders
                result = await send_push_reminders()
                if result.get("sent", 0) > 0:
                    logger.info(f"Push reminders sent: {result}")
            except Exception as e:
                logger.warning(f"Push reminder error: {e}")
    asyncio.get_event_loop().create_task(push_reminder_loop())
