import asyncio, os, sys, traceback
sys.path.insert(0, '.')
os.environ['MONGO_URL'] = 'mongodb+srv://brunomongo:i3FsFOU0mZxeN645@cluster0.glbiffm.mongodb.net/mbhs?retryWrites=true&w=majority'
os.environ['DB_NAME'] = 'mbhs'
os.environ['JWT_SECRET'] = 'local-dev-secret'

async def test():
    from database import db
    from auth import verify_password, create_token
    from datetime import datetime, timezone, timedelta
    try:
        # Passo 1: rate limit
        window_start = datetime.now(timezone.utc) - timedelta(seconds=900)
        count = await db.login_attempts.count_documents({"ip": "127.0.0.1", "ts": {"$gte": window_start.isoformat()}})
        print("Passo 1 OK - rate limit count:", count)

        # Passo 2: trova utente
        user = await db.users.find_one({"email": "admin@brunomelito.it"}, {"_id": 0})
        print("Passo 2 OK - user found:", user is not None)

        # Passo 3: token
        token = create_token(user["id"])
        print("Passo 3 OK - token:", token[:30])

        # Passo 4: costruisci risposta Pydantic
        from models import UserResponse, TokenResponse
        resp = TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"], email=user["email"], name=user["name"],
                salon_name=user.get("salon_name"), created_at=user.get("created_at")
            )
        )
        print("Passo 4 OK - response built")

    except Exception as e:
        print("ERRORE al passo corrente:", e)
        traceback.print_exc()

asyncio.run(test())
