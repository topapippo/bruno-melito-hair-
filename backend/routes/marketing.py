import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from database import db
from auth import get_current_user
from utils import send_whatsapp_template

router = APIRouter()
logger = logging.getLogger(__name__)


class CampaignRequest(BaseModel):
    template_name: str
    template_vars: List[str] = []
    target_segment: str  # "all", "dormant_90_days"


async def _run_campaign(uid: str, template_name: str, template_vars: list, client_ids: list):
    """Task in background: invia i messaggi con pausa di 4s tra un invio e l'altro per rispettare i limiti Meta."""
    sent_count = 0
    failed_count = 0

    for cid in client_ids:
        client = await db.clients.find_one({"id": cid, "user_id": uid}, {"_id": 0, "phone": 1, "name": 1})
        if client and client.get("phone"):
            first_name = (client.get("name") or "").split()[0] if (client.get("name") or "").split() else ""
            vars_to_send = [first_name] + template_vars
            result = await send_whatsapp_template(client["phone"], template_name, vars_to_send)

            if result.get("sent"):
                sent_count += 1
            else:
                failed_count += 1
                logger.warning(f"Campagna fallita per {client.get('name')}: {result.get('error')}")

            await asyncio.sleep(4)

    logger.info(f"Campagna utente {uid} terminata. Inviati: {sent_count}, Falliti: {failed_count}.")


@router.post("/marketing/send-campaign")
async def send_campaign(data: CampaignRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Avvia una campagna marketing in background. Limite di sicurezza: max 500 destinatari per batch."""
    uid = current_user["id"]

    query = {"user_id": uid, "phone": {"$exists": True, "$ne": ""}}

    if data.target_segment == "dormant_90_days":
        ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
        query["created_at"] = {"$lte": ninety_days_ago}
        query["total_visits"] = {"$gt": 0}

    clients = await db.clients.find(query, {"_id": 0, "id": 1}).to_list(500)
    client_ids = [c["id"] for c in clients]

    if not client_ids:
        raise HTTPException(status_code=400, detail="Nessun cliente nel target selezionato")

    background_tasks.add_task(_run_campaign, uid, data.template_name, data.template_vars, client_ids)

    return {"success": True, "message": f"Campagna avviata per {len(client_ids)} clienti (invio in background, ~4s tra un messaggio e l'altro)."}
