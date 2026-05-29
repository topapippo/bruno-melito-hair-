from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv
import gridfs
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("Variabile d'ambiente MONGO_URL non impostata")
db_name = os.environ.get('DB_NAME')
if not db_name:
    raise RuntimeError("Variabile d'ambiente DB_NAME non impostata")

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
)
db = client[db_name]

# Sync client for file serving (used in synchronous get_object)
sync_client = MongoClient(mongo_url)
sync_db = sync_client[db_name]

# GridFS per foto/video: spezzetta i file in chunk, niente limite 16MB del singolo
# documento BSON, e sopravvive ai redeploy di Render (storage durevole in MongoDB).
fs = gridfs.GridFS(sync_db)
