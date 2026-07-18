import re
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends

from database import db
from auth import get_current_user
from utils import send_whatsapp_cloud

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/messages/inbox")
async def get_inbox(current_user: dict = Depends(get_current_user)):
    """Ultimi messaggi ricevuti dell'utente, raggruppati per numero di telefono."""
    uid = current_user["id"]

    messages = await db.communication_logs.find(
        {"user_id": uid, "direction": "inbound"}, {"_id": 0}
    ).sort("timestamp", -1).to_list(200)
    if not messages:
        return []

    clients = await db.clients.find(
        {"user_id": uid}, {"_id": 0, "phone": 1, "name": 1}
    ).to_list(5000)
    phone_to_name = {
        c["phone"][-9:]: c.get("name", "Sconosciuto")
        for c in clients if c.get("phone") and len(c["phone"]) >= 9
    }

    chats = {}
    for msg in messages:
        phone = msg.get("phone")
        if not phone:
            continue
        suffix = phone[-9:] if len(phone) >= 9 else phone
        if phone not in chats:
            chats[phone] = {
                "phone": phone,
                "client_name": phone_to_name.get(suffix, "Sconosciuto"),
                "last_message": msg.get("message", ""),
                "timestamp": msg.get("timestamp"),
                "messages": [],
            }
        chats[phone]["messages"].append(msg)

    return sorted(chats.values(), key=lambda x: x["timestamp"] or "", reverse=True)


@router.post("/messages/send")
async def send_manual_message(data: dict, current_user: dict = Depends(get_current_user)):
    """Invia un messaggio WhatsApp manuale a un cliente dal gestionale."""
    uid = current_user["id"]
    phone = data.get("phone")
    text = data.get("text")
    if not phone or not text:
        raise HTTPException(status_code=400, detail="Telefono e testo obbligatori")

    suffix = phone[-9:] if len(phone) >= 9 else phone
    owns_client = await db.clients.find_one(
        {"user_id": uid, "phone": {"$regex": re.escape(suffix) + "$"}}
    )
    if not owns_client:
        raise HTTPException(status_code=403, detail="Non puoi inviare messaggi a numeri non in rubrica")

    result = await send_whatsapp_cloud(phone, text)
    await db.communication_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "channel": "whatsapp",
        "phone": phone,
        "message": text[:1000],
        "sent": result.get("sent", False),
        "method": "manual_inbox",
        "error": result.get("error"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    if result.get("sent"):
        return {"success": True}
    logger.error(f"Invio manuale fallito per {phone}: {result.get('error')}")
    return {"success": False, "error": result.get("error", "Errore sconosciuto")}
