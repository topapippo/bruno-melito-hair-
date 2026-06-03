import asyncio
import os
import re

async def check():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url:
        try:
            with open('.env', 'r') as f:
                content = f.read()
                mongo_url = re.search(r'MONGO_URL=(.*)', content).group(1).strip()
                db_name = re.search(r'DB_NAME=(.*)', content).group(1).strip()
        except:
            pass
            
    if not mongo_url:
        print("Missing MONGO_URL")
        return

    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    logs = await db.communication_logs.find().sort("timestamp", -1).to_list(10)
    print("--- LAST COMMUNICATION LOGS ---")
    for l in logs:
        print(f"Time: {l.get('timestamp')}, Phone: {l.get('phone')}, Sent: {l.get('sent')}, Method: {l.get('method')}, Msg: {l.get('message')[:50]}...")

if __name__ == "__main__":
    asyncio.run(check())
