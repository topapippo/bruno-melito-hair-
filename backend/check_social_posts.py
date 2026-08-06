#!/usr/bin/env python3
"""Check what's in the social_posts collection"""
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

async def check_posts():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Conta totali
    count = await db.social_posts.count_documents({})
    print(f"📊 Total posts: {count}\n")

    # Controlla primo post
    post = await db.social_posts.find_one({})
    if post:
        print("📄 Sample post (primo):")
        print(f"  id: {post.get('id', 'MISSING')}")
        print(f"  user_id: {post.get('user_id', 'MISSING')}")
        print(f"  schedule_day: {post.get('schedule_day', 'MISSING')}")
        print(f"  caption: {len(post.get('caption', ''))} chars - ", end="")
        if post.get('caption'):
            print("✅ HAS CAPTION")
            print(f"    Preview: {post.get('caption')[:100]}...")
        else:
            print("❌ NO CAPTION (empty or missing)")
        print(f"  platforms: {post.get('platforms', 'MISSING')}")
        print(f"  status: {post.get('status', 'MISSING')}")
    else:
        print("❌ No posts found in database!")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_posts())
