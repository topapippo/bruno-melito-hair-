from fastapi import APIRouter, Depends
from database import db
from auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/fix/check-ids")
async def check_ids(current_user: dict = Depends(get_current_user)):
    # Get public admin user
    from routes.public import get_public_admin_user
    public_admin = await get_public_admin_user()
    
    return {
        "current_user_id": current_user["id"],
        "current_user_email": current_user["email"],
        "public_admin_id": public_admin["id"] if public_admin else None,
        "match": current_user["id"] == (public_admin["id"] if public_admin else None)
    }

@router.get("/fix-ghost-payments")
async def fix_ghost_payments():
    res = await db.payments.delete_many({"payment_method": "sospeso", "total_paid": 10})
    return {"status": "ok", "deleted_count": res.deleted_count}

@router.get("/check-comm-logs")
async def check_comm_logs(current_user: dict = Depends(get_current_user)):
    logs = await db.communication_logs.find({"user_id": current_user["id"]}).sort("timestamp", -1).to_list(20)
    for l in logs: l.pop("_id", None)
    return logs
