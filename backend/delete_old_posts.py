#!/usr/bin/env python3
"""Delete old posts without caption"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'bruno_melito_db')

if len(sys.argv) > 1:
    mongo_url = sys.argv[1]

if not mongo_url:
    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
    mongo_url = os.environ.get('MONGO_URL')

if not mongo_url:
    raise RuntimeError("MONGO_URL non trovata")

async def delete_old_posts():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    admin_id = "8fcb8ee4-a6ba-485d-bc63-ebb55f711dc2"

    # Elimina tutti i post dell'admin che non hanno caption
    result = await db.social_posts.delete_many({
        "user_id": admin_id,
        "$or": [
            {"caption": {"$exists": False}},
            {"caption": ""},
            {"caption": None}
        ]
    })

    print(f"✅ Eliminati {result.deleted_count} post vecchi senza caption")

    # Verifica quanti restano
    remaining = await db.social_posts.count_documents({"user_id": admin_id})
    print(f"📊 Rimangono {remaining} post con caption")

    client.close()

if __name__ == "__main__":
    asyncio.run(delete_old_posts())
