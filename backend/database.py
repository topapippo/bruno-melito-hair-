from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Sync client for file serving (used in synchronous get_object)
sync_client = MongoClient(mongo_url)
sync_db = sync_client[os.environ['DB_NAME']]
