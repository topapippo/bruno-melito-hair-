#!/usr/bin/env python3
"""Fix imported posts to use correct admin user_id UUID"""
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

async def fix_posts():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    old_user_id = "admin@brunomelito.it"
    correct_user_id = "8fcb8ee4-a6ba-485d-bc63-ebb55f711dc2"

    # Update all posts with wrong user_id
    result = await db.social_posts.update_many(
        {"user_id": old_user_id},
        {"$set": {"user_id": correct_user_id}}
    )

    print(f"✅ Updated {result.modified_count} posts")
    print(f"   From user_id: {old_user_id}")
    print(f"   To user_id: {correct_user_id}")

    # Verify
    count = await db.social_posts.count_documents({"user_id": correct_user_id})
    print(f"\n📊 Now {count} posts for correct user_id")

    client.close()

if __name__ == "__main__":
    asyncio.run(fix_posts())
