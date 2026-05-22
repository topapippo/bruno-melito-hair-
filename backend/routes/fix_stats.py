from fastapi import APIRouter, Depends
from database import db
from auth import get_current_user

router = APIRouter()

@router.get("/fix-ghost-payments")
async def fix_ghost_payments(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    # Elimina i pagamenti sospesi di 10 euro che non esistono nella realtà
    res = await db.payments.delete_many({
        "user_id": uid,
        "payment_method": "sospeso",
        "total_paid": 10
    })
    return {"status": "ok", "deleted_count": res.deleted_count}
