from fastapi import APIRouter, Depends
from database import db
from auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/fix/public-debug")
async def public_debug():
    """Endpoint pubblico per verificare quale account riceve le prenotazioni."""
    from routes.public import PUBLIC_ADMIN_EMAIL, get_public_admin_user
    user = await get_public_admin_user()
    
    # Conta quanti servizi e appuntamenti ha questo utente
    svc_count = 0
    apt_count = 0
    if user:
        svc_count = await db.services.count_documents({"user_id": user["id"]})
        apt_count = await db.appointments.count_documents({"user_id": user["id"]})
        
    return {
        "configured_email": PUBLIC_ADMIN_EMAIL,
        "active_user_id": user["id"] if user else None,
        "active_user_email": user.get("email") if user else None,
        "stats": {
            "services": svc_count,
            "total_appointments": apt_count
        }
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
