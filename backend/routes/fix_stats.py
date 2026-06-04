from fastapi import APIRouter, Depends
from database import db
from auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/fix-ghost-payments")
async def fix_ghost_payments():
    res = await db.payments.delete_many({"payment_method": "sospeso", "total_paid": 10})
    return {"status": "ok", "deleted_count": res.deleted_count}

@router.get("/check-comm-logs")
async def check_comm_logs(current_user: dict = Depends(get_current_user)):
    """Restituisce gli ultimi 20 log di comunicazione per audit rapido."""
    logs = await db.communication_logs.find({"user_id": current_user["id"]}).sort("timestamp", -1).to_list(20)
    for l in logs: l.pop("_id", None)
    return logs

@router.get("/test-whatsapp-logic")
async def test_wa_logic(phone: str, current_user: dict = Depends(get_current_user)):
    """Testa la catena di invio per un numero specifico."""
    from utils import send_whatsapp
    result = await send_whatsapp(phone, "Test logica automatica Bruno Melito Hair", current_user)
    return {"result": result}
