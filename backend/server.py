from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import logging
import os
import asyncio

from database import client as mongo_client, db
from routes import all_routers

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warmup in background
    try:
        from routes.public import public_get_website
        asyncio.create_task(public_get_website())
    except: pass
    yield
    mongo_client.close()

app = FastAPI(title="MBHS SALON API", lifespan=lifespan)

# Health checks at root for Render/UptimeRobot
@app.get("/health")
@app.head("/health")
@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/warmup")
@app.head("/api/warmup")
async def api_warmup_check():
    return {"status": "warming", "ok": True}

# CORS
cors_origins = [
    "http://localhost:3000",
    "https://bruno-melito-hair.onrender.com",
    "https://brunomelitohair.it",
    "https://www.brunomelitohair.it",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def api_root():
    return {"message": "Salone Parrucchiera API", "status": "ok"}

# Mount all routers under /api
for router in all_routers:
    api_router.include_router(router)

app.include_router(api_router)
