#!/usr/bin/env python3
"""Test the GET /social/posts endpoint directly"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

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

async def test_endpoint():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Simula l'endpoint: filtra per user_id admin e ritorna con fallback
    current_user_id = "admin@brunomelito.it"

    posts = await db.social_posts.find(
        {"user_id": current_user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    print(f"📊 Found {len(posts)} posts for user_id: {current_user_id}\n")

    if posts:
        # Mostra il primo post come il backend lo ritornerebbe
        p = posts[0]
        response_post = {
            **p,
            "status": p.get("status", "draft"),
            "platforms": p.get("platforms", []),
            "image_urls": p.get("image_urls", []),
            "schedule_day": p.get("schedule_day", ""),
            "caption": p.get("caption", ""),
        }

        print("📄 First post (as returned by endpoint):")
        print(f"  id: {response_post.get('id')[:8]}...")
        print(f"  schedule_day: '{response_post.get('schedule_day')}'")
        print(f"  status: '{response_post.get('status')}'")
        print(f"  platforms: {response_post.get('platforms')}")
        print(f"  caption: {len(response_post.get('caption', ''))} chars")
        if response_post.get('caption'):
            print(f"    Preview: {response_post.get('caption')[:80]}...")
        else:
            print(f"    ❌ EMPTY CAPTION!")
    else:
        print("❌ No posts found for this user!")

    client.close()

if __name__ == "__main__":
    asyncio.run(test_endpoint())
