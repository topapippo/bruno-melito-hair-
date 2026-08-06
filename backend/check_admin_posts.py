#!/usr/bin/env python3
"""Check if admin posts were imported"""
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

async def check_admin_posts():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Controlla posts per user_id admin
    admin_count = await db.social_posts.count_documents({"user_id": "admin@brunomelito.it"})
    print(f"Posts for 'admin@brunomelito.it': {admin_count}")

    # Se ce ne sono, mostra il primo
    if admin_count > 0:
        post = await db.social_posts.find_one({"user_id": "admin@brunomelito.it"})
        print("\n✅ Found admin post:")
        print(f"  schedule_day: {post.get('schedule_day', 'MISSING')}")
        print(f"  caption length: {len(post.get('caption', ''))} chars")
        if post.get('caption'):
            print(f"  caption preview: {post.get('caption')[:80]}...")
        print(f"  platforms: {post.get('platforms', 'MISSING')}")
    else:
        print("❌ No admin posts found - import FAILED")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_admin_posts())
