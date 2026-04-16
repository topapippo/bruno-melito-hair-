from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("Variabile d'ambiente MONGO_URL non impostata")
db_name = os.environ.get('DB_NAME')
if not db_name:
    raise RuntimeError("Variabile d'ambiente DB_NAME non impostata")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Sync client for file serving (used in synchronous get_object)
sync_client = MongoClient(mongo_url)
sync_db = sync_client[db_name]
