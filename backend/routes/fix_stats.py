from fastapi import APIRouter
from database import db

router = APIRouter()

@router.get("/fix-ghost-payments")
async def fix_ghost_payments():
    res = await db.payments.delete_many({
        "payment_method": "sospeso",
        "total_paid": 10
    })
    return {"status": "ok", "deleted_count": res.deleted_count, "message": "Il fantasma è stato rimosso!"}

@router.get("/check-comm-logs")
async def check_comm_logs():
    logs = await db.communication_logs.find().sort("timestamp", -1).to_list(20)
    for l in logs: l.pop("_id", None)
    return logs
