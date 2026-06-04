import asyncio
import os
import re
from motor.motor_asyncio import AsyncIOMotorClient

async def debug():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url:
        try:
            with open('.env', 'r') as f:
                content = f.read()
                mongo_url = re.search(r'MONGO_URL=(.*)', content).group(1).strip()
                db_name = re.search(r'DB_NAME=(.*)', content).group(1).strip()
        except: pass

    if not mongo_url:
        print("No DB config found")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    user = await db.users.find_one({"email": "admin@brunomelito.it"})
    if not user:
        user = await db.users.find_one({})
    
    print(f"Checking suggestions for user: {user.get('email')} ({user.get('id')})")
    
    suggestions = await db.wingman_suggestions.find({"user_id": user.get('id')}).to_list(100)
    print(f"Found {len(suggestions)} suggestions.")
    for s in suggestions:
        print(f"- Title: {s.get('title')}, Text present: {bool(s.get('text'))}, Text preview: {str(s.get('text'))[:30]}...")

if __name__ == "__main__":
    asyncio.run(debug())
