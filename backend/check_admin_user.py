#!/usr/bin/env python3
"""Check admin user in database"""
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

async def check_admin_user():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Cerca l'admin per email
    user = await db.users.find_one({"email": "admin@brunomelito.it"}, {"_id": 0})
    if user:
        print("✅ Found admin user:")
        print(f"  email: {user.get('email')}")
        print(f"  id: {user.get('id')}")
        print(f"  role: {user.get('role')}")
        print(f"\nImported posts have user_id: 'admin@brunomelito.it'")
        print(f"But user.id in DB is: '{user.get('id')}'")
        if user.get('id') != "admin@brunomelito.it":
            print(f"\n❌ MISMATCH! Need to re-import posts with user_id: '{user.get('id')}'")
    else:
        print("❌ Admin user not found!")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_admin_user())
