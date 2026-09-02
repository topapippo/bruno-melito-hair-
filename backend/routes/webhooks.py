import os
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from database import db

router = APIRouter()
logger = logging.getLogger(__name__)

VERIFY_TOKEN = os.environ.get("WA_WEBHOOK_VERIFY_TOKEN", "")
PUBLIC_ADMIN_EMAIL = os.environ.get("PUBLIC_ADMIN_EMAIL", "admin@brunomelito.it")


@router.get("/whatsapp/webhook")
async def verify_webhook(request: Request):
    """Verifica iniziale richiesta da Meta per confermare la proprietà del webhook."""
    params = request.query_params
    if VERIFY_TOKEN and params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == VERIFY_TOKEN:
        return int(params.get("hub.challenge", 0))
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp/webhook")
async def receive_whatsapp_message(request: Request):
    """Riceve i messaggi WhatsApp in entrata dai clienti (Meta Cloud API) e li registra nello storico
    comunicazioni del gestionale (stessa collection letta da /communication-logs)."""
    try:
        body = await request.json()
        admin = await db.users.find_one({"email": PUBLIC_ADMIN_EMAIL}, {"_id": 0, "id": 1})
        if not admin:
            return {"status": "ok"}

        if body.get("object") == "whatsapp_business_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    if change.get("field") != "messages":
                        continue
                    value = change.get("value", {})
                    for message_info in value.get("messages", []):
                        phone_from = message_info.get("from")
                        msg_type = message_info.get("type")

                        text = ""
                        if msg_type == "text":
                            text = message_info.get("text", {}).get("body", "")
                        elif msg_type == "button":
                            text = message_info.get("button", {}).get("text", "")

                        if not (phone_from and text):
                            continue

                        await db.communication_logs.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": admin["id"],
                            "phone": phone_from,
                            "type": "inbound",
                            "direction": "inbound",
                            "message": text[:1000],
                            "sent": True,
                            "provider": "whatsapp_cloud",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        logger.info(f"Messaggio WhatsApp ricevuto da {phone_from}")

                    # Stato di consegna reale dei messaggi in uscita (Meta li manda su
                    # questo stesso webhook, campo "statuses" — prima non venivano mai letti,
                    # quindi ogni invio restava per sempre "sent" anche se poi falliva)
                    for status_info in value.get("statuses", []):
                        wamid = status_info.get("id")
                        delivery_status = status_info.get("status")  # sent | delivered | read | failed
                        if not (wamid and delivery_status):
                            continue
                        update_fields = {
                            "delivery_status": delivery_status,
                            "delivery_updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                        errors = status_info.get("errors")
                        if errors:
                            update_fields["delivery_error"] = errors[0].get("title") or errors[0].get("message")
                        await db.communication_logs.update_one(
                            {"wa_message_id": wamid}, {"$set": update_fields}
                        )
                        if delivery_status == "failed":
                            logger.warning(
                                f"WhatsApp non consegnato a {status_info.get('recipient_id')}: {update_fields.get('delivery_error')}"
                            )
    except Exception as e:
        logger.error(f"Errore processazione webhook WhatsApp: {e}")

    return {"status": "ok"}  # Meta richiede sempre 200 OK
