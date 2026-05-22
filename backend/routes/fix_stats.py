from fastapi import APIRouter
from database import db

router = APIRouter()

@router.get("/fix-ghost-payments")
async def fix_ghost_payments():
    # Elimina i pagamenti sospesi di 10 euro che non esistono nella realtà
    # Non richiede autenticazione per permettere il clic diretto dal link
    res = await db.payments.delete_many({
        "payment_method": "sospeso",
        "total_paid": 10
    })
    return {"status": "ok", "deleted_count": res.deleted_count, "message": "Il fantasma è stato rimosso!"}
