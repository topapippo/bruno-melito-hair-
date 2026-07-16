from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta


def _fmt_date_it(date_str: str) -> str:
    """Format YYYY-MM-DD as dd/MM/yy for Italian display in messages."""
    try:
        parts = str(date_str).split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0][2:]}"
        return date_str
    except Exception:
        return date_str
import uuid
import os
import re
import asyncio
import logging

from database import db
from auth import get_current_user
from utils import (twilio_client, TWILIO_PHONE_NUMBER,
                   normalize_phone_wa, send_whatsapp, send_whatsapp_cloud,
                   send_automatic_message, send_whatsapp_template, visit_done_filter, WA_TOKEN)
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class MessageTemplateCreate(BaseModel):
    name: str
    text: str
    template_type: str = "appointment"

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    text: Optional[str] = None



@router.get("/sms/status")
async def get_sms_status(current_user: dict = Depends(get_current_user)):
    return {"configured": twilio_client is not None and TWILIO_PHONE_NUMBER is not None,
            "phone_number": TWILIO_PHONE_NUMBER if TWILIO_PHONE_NUMBER else None}


# ============== REMINDERS / RICHIAMI ==============

@router.get("/reminders/color-expiry")
async def get_color_expiry_reminders(current_user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    color_keywords = ["color", "colore", "tinta", "meche", "balayage", "schiaritu", "colpi di sole"]
    color_regex = "|".join(color_keywords)
    services = await db.services.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(200)
    color_service_ids = [s["id"] for s in services if any(kw in s["name"].lower() for kw in color_keywords)]

    # Cerca per service_ids (efficiente) O per nome servizio embedded (fallback per appuntamenti
    # creati senza service_ids o con servizi rinominati/ricreati)
    base_match = {"user_id": current_user["id"], "status": {"$ne": "cancelled"}}
    if color_service_ids:
        base_match["$or"] = [
            {"service_ids": {"$in": color_service_ids}},
            {"services.name": {"$regex": color_regex, "$options": "i"}}
        ]
    else:
        base_match["services.name"] = {"$regex": color_regex, "$options": "i"}

    pipeline = [
        {"$match": base_match},
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$client_id",
            "last_date": {"$first": "$date"},
            "last_services": {"$first": "$services"},
            "client_name": {"$first": "$client_name"},
            "client_phone": {"$first": "$client_phone"}
        }},
        # Escludi clienti generici/anonimi e mostra solo chi ha l'ultimo colore > 30gg fa
        {"$match": {"last_date": {"$lte": cutoff}, "_id": {"$nin": [None, "", "generic"]}}}
    ]
    results = await db.appointments.aggregate(pipeline).to_list(100)
    client_ids = [r["_id"] for r in results]
    clients = {c["id"]: c for c in await db.clients.find({"id": {"$in": client_ids}, "user_id": current_user["id"]}, {"_id": 0}).to_list(100)}

    # Se il client_id dell'appuntamento non corrisponde a nessun documento cliente (record orfano/duplicato),
    # cerca il cliente per nome — questo risolve i casi in cui la stessa persona è stata creata due volte
    # e gli appuntamenti sono rimasti sul vecchio record
    for r in results:
        if r["_id"] not in clients and r.get("client_name"):
            found = await db.clients.find_one(
                {"user_id": current_user["id"], "name": {"$regex": f"^{r['client_name'].strip()}$", "$options": "i"}},
                {"_id": 0}
            )
            if found:
                # Usa il client_id reale (del documento esistente) per il link allo storico
                clients[r["_id"]] = found
                r["_real_client_id"] = found["id"]

    sent = await db.reminders_sent.find({"user_id": current_user["id"], "type": "color_expiry"}, {"_id": 0}).to_list(500)
    sent_client_ids = {s["client_id"] for s in sent}
    output = []
    for r in results:
        client_doc = clients.get(r["_id"], {})
        real_client_id = r.get("_real_client_id", r["_id"])
        output.append({
            "client_id": real_client_id,
            "client_name": r["client_name"],
            "last_color_date": r["last_date"],
            "days_ago": (datetime.now(timezone.utc) - datetime.strptime(r["last_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)).days if r.get("last_date") else 0,
            "phone": client_doc.get("phone", "") or r.get("client_phone", ""),
            "already_sent": r["_id"] in sent_client_ids or real_client_id in sent_client_ids
        })
    return output


@router.post("/reminders/color-expiry/{client_id}/send")
async def send_color_reminder(client_id: str, current_user: dict = Depends(get_current_user)):
    """Invia il template richiamo_colore al cliente via Cloud API Meta."""
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    phone = client.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")
    first_name = (client.get("name") or "").split()[0] or "cara cliente"

    result = await send_automatic_message(phone, "richiamo_colore", [first_name], None, current_user)

    if result.get("sent"):
        await db.reminders_sent.insert_one({
            "id": str(uuid.uuid4()), "user_id": current_user["id"],
            "type": "color_expiry", "client_id": client_id,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
    return {"sent": result.get("sent", False), "method": result.get("method"), "error": result.get("error")}


@router.post("/reminders/color-expiry/{client_id}/mark-sent")
async def mark_color_reminder_sent(client_id: str, current_user: dict = Depends(get_current_user)):
    await db.reminders_sent.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "type": "color_expiry", "client_id": client_id,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True}


@router.delete("/reminders/color-expiry/{client_id}/reset")
async def reset_color_reminder(client_id: str, current_user: dict = Depends(get_current_user)):
    await db.reminders_sent.delete_many({"user_id": current_user["id"], "type": "color_expiry", "client_id": client_id})
    return {"success": True}


# ============== MESSAGE TEMPLATES ==============

@router.get("/reminders/templates")
async def get_message_templates(current_user: dict = Depends(get_current_user)):
    templates = await db.message_templates.find({"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}).to_list(50)
    if not templates:
        defaults = [
            {"id": str(uuid.uuid4()), "user_id": current_user["id"], "name": "Promemoria Appuntamento",
             "text": "Ciao {nome}! Ti ricordiamo il tuo appuntamento domani alle {ora} presso MBHS SALON. Servizi: {servizi}. Ti aspettiamo!",
             "template_type": "appointment", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": current_user["id"], "name": "Richiamo Cliente Inattivo",
             "text": "Ciao {nome}! Sono passati {giorni} giorni dalla tua ultima visita presso MBHS SALON. Torna a trovarci, ti aspettiamo!",
             "template_type": "recall", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": current_user["id"], "name": "Scadenza Colore",
             "text": "Ciao {nome}! Sono passati {giorni} giorni dal tuo ultimo colore. E' il momento di rinfrescare il look! Prenota da Bruno Melito Hair.",
             "template_type": "color_expiry", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "user_id": current_user["id"], "name": "Ringraziamento Post-Incasso",
             "text": "Ciao {nome}! Grazie per essere venuto da Bruno Melito Hair.\n\nTi aspettiamo presto per il tuo prossimo appuntamento!\n\nA presto!",
             "template_type": "thank_you", "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        for d in defaults:
            await db.message_templates.insert_one(d)
        templates = [{k: v for k, v in d.items() if k not in ("_id", "user_id")} for d in defaults]
    else:
        # Se i template esistono ma manca il "thank_you", aggiungilo automaticamente
        existing_types = {t.get("template_type") for t in templates}
        if "thank_you" not in existing_types:
            thank_you = {
                "id": str(uuid.uuid4()), "user_id": current_user["id"],
                "name": "Ringraziamento Post-Incasso",
                "text": "Ciao {nome}! Grazie per essere venuto da Bruno Melito Hair.\n\nTi aspettiamo presto per il tuo prossimo appuntamento!\n\nA presto!",
                "template_type": "thank_you",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.message_templates.insert_one(thank_you)
            templates.append({k: v for k, v in thank_you.items() if k not in ("_id", "user_id")})
    return templates


@router.post("/reminders/templates")
async def create_message_template(data: MessageTemplateCreate, current_user: dict = Depends(get_current_user)):
    template = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "name": data.name, "text": data.text, "template_type": data.template_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.message_templates.insert_one(template)
    return {k: v for k, v in template.items() if k not in ("_id", "user_id")}


@router.put("/reminders/templates/{template_id}")
async def update_message_template(template_id: str, data: MessageTemplateUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.message_templates.update_one({"id": template_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return await db.message_templates.find_one({"id": template_id}, {"_id": 0, "user_id": 0})


@router.delete("/reminders/templates/{template_id}")
async def delete_message_template(template_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.message_templates.delete_one({"id": template_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"success": True}


# ============== TOMORROW REMINDERS ==============

@router.get("/reminders/tomorrow")
async def get_tomorrow_reminders(current_user: dict = Depends(get_current_user)):
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    appointments = await db.appointments.find(
        {"user_id": current_user["id"], "date": tomorrow, "status": {"$ne": "cancelled"}}, {"_id": 0}
    ).to_list(100)
    reminded_ids = set()
    reminders_sent = await db.reminders_sent.find(
        {"user_id": current_user["id"], "type": "appointment", "date": tomorrow}, {"_id": 0}
    ).to_list(500)
    for r in reminders_sent:
        reminded_ids.add(r.get("appointment_id"))
    missing_phone_ids = [apt["client_id"] for apt in appointments if not apt.get("client_phone") and apt.get("client_id")]
    if missing_phone_ids:
        missing_list = await db.clients.find(
            {"id": {"$in": missing_phone_ids}, "user_id": current_user["id"]}, {"_id": 0, "id": 1, "phone": 1}
        ).to_list(len(missing_phone_ids) + 1)
        missing_map = {c["id"]: c for c in missing_list}
    else:
        missing_map = {}

    results = []
    for apt in appointments:
        client_phone = apt.get("client_phone", "")
        if not client_phone and apt.get("client_id"):
            cl = missing_map.get(apt["client_id"])
            if cl:
                client_phone = cl.get("phone", "")
        results.append({
            "id": apt["id"], "client_name": apt.get("client_name", ""),
            "client_phone": client_phone, "client_id": apt.get("client_id", ""),
            "date": apt["date"], "time": apt["time"],
            "services": apt.get("services", []), "operator_name": apt.get("operator_name", ""),
            "reminded": apt["id"] in reminded_ids,
            "confirmation_status": apt.get("confirmation_status"),
            "confirmation_sent_at": apt.get("confirmation_sent_at"),
        })
    return results


@router.post("/reminders/batch-mark-sent")
async def batch_mark_reminders_sent(data: dict, current_user: dict = Depends(get_current_user)):
    appointment_ids = data.get("appointment_ids", [])
    if not appointment_ids:
        raise HTTPException(status_code=400, detail="Nessun appuntamento specificato")
    count = 0
    # Batch: 1 query per tutti gli appuntamenti + 1 per quelli già segnati
    apts_list, already_sent_list = await asyncio.gather(
        db.appointments.find(
            {"id": {"$in": appointment_ids}, "user_id": current_user["id"]}, {"_id": 0}
        ).to_list(len(appointment_ids) + 1),
        db.reminders_sent.find(
            {"user_id": current_user["id"], "type": "appointment", "appointment_id": {"$in": appointment_ids}}
        ).to_list(len(appointment_ids) + 1),
    )
    apts_map = {a["id"]: a for a in apts_list}
    already_sent_ids = {r["appointment_id"] for r in already_sent_list}
    new_reminders = []
    for apt_id in appointment_ids:
        apt = apts_map.get(apt_id)
        if apt and apt_id not in already_sent_ids:
            new_reminders.append({
                "id": str(uuid.uuid4()), "user_id": current_user["id"],
                "type": "appointment", "appointment_id": apt_id,
                "client_id": apt.get("client_id"), "date": apt["date"],
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
            count += 1
    if new_reminders:
        await db.reminders_sent.insert_many(new_reminders)
    return {"success": True, "marked_count": count}


@router.get("/reminders/auto-check")
async def auto_reminder_check(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    is_reminder_time = now.hour >= 14
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    appointments = await db.appointments.find(
        {"user_id": current_user["id"], "date": tomorrow, "status": {"$ne": "cancelled"}}, {"_id": 0}
    ).to_list(100)
    reminded_ids = set()
    reminders_sent = await db.reminders_sent.find(
        {"user_id": current_user["id"], "type": "appointment", "date": tomorrow}, {"_id": 0}
    ).to_list(500)
    for r in reminders_sent:
        reminded_ids.add(r.get("appointment_id"))
    # Batch lookup per clienti senza phone salvato nell'appuntamento
    missing_phone_ids = [apt["client_id"] for apt in appointments if not apt.get("client_phone") and apt.get("client_id")]
    if missing_phone_ids:
        missing_list = await db.clients.find(
            {"id": {"$in": missing_phone_ids}, "user_id": current_user["id"]}, {"_id": 0, "id": 1, "phone": 1}
        ).to_list(len(missing_phone_ids) + 1)
        missing_map = {c["id"]: c for c in missing_list}
    else:
        missing_map = {}
    pending = []
    for apt in appointments:
        if apt["id"] not in reminded_ids:
            client_phone = apt.get("client_phone", "")
            if not client_phone and apt.get("client_id"):
                cl = missing_map.get(apt["client_id"])
                if cl:
                    client_phone = cl.get("phone", "")
            if client_phone:
                pending.append({
                    "id": apt["id"], "client_name": apt.get("client_name", ""),
                    "client_phone": client_phone, "time": apt["time"], "services": apt.get("services", []),
                })
    return {
        "is_reminder_time": is_reminder_time, "tomorrow_date": tomorrow,
        "total_tomorrow": len(appointments), "already_sent": len(reminded_ids), "pending": pending
    }


@router.post("/reminders/appointment/{appointment_id}/mark-sent")
async def mark_reminder_sent(appointment_id: str, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    await db.reminders_sent.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "type": "appointment", "appointment_id": appointment_id,
        "client_id": apt.get("client_id"), "date": apt["date"],
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True}


@router.delete("/reminders/appointment/{appointment_id}/reset")
async def reset_reminder(appointment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reminders_sent.delete_many(
        {"user_id": current_user["id"], "type": "appointment", "appointment_id": appointment_id}
    )
    return {"success": True, "deleted": result.deleted_count}


# Tracciamento "già richiamato" — condiviso con /clients/dormant (Clienti Assenti)
@router.post("/reminders/inactive/{client_id}/mark-sent")
async def mark_inactive_recall_sent(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    await db.reminders_sent.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "type": "inactive_recall", "client_id": client_id,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True}


@router.delete("/reminders/inactive/{client_id}/reset")
async def reset_inactive_recall(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reminders_sent.delete_many(
        {"user_id": current_user["id"], "type": "inactive_recall", "client_id": client_id}
    )
    return {"success": True, "deleted": result.deleted_count}


@router.get("/reminders/birthdays")
async def get_upcoming_birthdays(days: int = 7, current_user: dict = Depends(get_current_user)):
    """Restituisce i clienti con compleanno nei prossimi N giorni (default 7)."""
    today = datetime.now(timezone.utc)
    upcoming = []
    clients = await db.clients.find(
        {"user_id": current_user["id"], "birthday": {"$ne": None, "$exists": True}},
        {"_id": 0}
    ).to_list(1000)
    for client in clients:
        bday = client.get("birthday")
        if not bday:
            continue
        try:
            # Supporta formato MM-DD
            if len(bday) == 5 and bday[2] == '-':
                month, day = int(bday[:2]), int(bday[3:])
            elif len(bday) >= 8 and bday[4] == '-':
                month, day = int(bday[5:7]), int(bday[8:10])
            else:
                continue
            # Calcola il prossimo compleanno
            this_year_bday = today.replace(month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
            if this_year_bday < today.replace(hour=0, minute=0, second=0, microsecond=0):
                this_year_bday = this_year_bday.replace(year=today.year + 1)
            days_until = (this_year_bday - today.replace(hour=0, minute=0, second=0, microsecond=0)).days
            if 0 <= days_until <= days:
                upcoming.append({
                    "client_id": client["id"],
                    "client_name": client["name"],
                    "client_phone": client.get("phone", ""),
                    "birthday": bday,
                    "days_until": days_until,
                    "is_today": days_until == 0,
                })
        except (ValueError, KeyError):
            continue
    upcoming.sort(key=lambda x: x["days_until"])
    return upcoming


@router.post("/reminders/birthday-auto-send")
async def birthday_auto_send(current_user: dict = Depends(get_current_user)):
    """Manda automaticamente un WhatsApp di auguri ai clienti che compiono gli anni oggi.
    Idempotente: se già inviato oggi non manda di nuovo."""
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    salon_name = current_user.get("salon_name", "Bruno Melito Hair")

    clients = await db.clients.find(
        {"user_id": current_user["id"], "birthday": {"$ne": None, "$exists": True}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "birthday": 1}
    ).to_list(500)

    sent = 0
    skipped = 0

    for client in clients:
        bday = client.get("birthday", "")
        if not bday:
            continue
        try:
            if len(bday) == 5 and bday[2] == '-':
                month, day = int(bday[:2]), int(bday[3:])
            elif len(bday) >= 8 and bday[4] == '-':
                month, day = int(bday[5:7]), int(bday[8:10])
            else:
                continue
            if today.month != month or today.day != day:
                continue
        except (ValueError, IndexError):
            continue

        existing = await db.reminders_sent.find_one({
            "user_id": current_user["id"], "type": "birthday",
            "client_id": client["id"], "date": today_str
        })
        if existing:
            skipped += 1
            continue

        phone = client.get("phone")
        if not phone:
            skipped += 1
            continue

        first_name = (client.get("name") or "").split()[0] or "cara cliente"
        message = (
            f"🎂 Tanti auguri {first_name}! "
            f"Tutto il team di {salon_name} ti augura una splendida giornata! 🥂\n\n"
            f"Come regalo di compleanno hai diritto a uno sconto speciale alla tua prossima visita. "
            f"Prenota qui: https://brunomelitohair.it/prenota 💕"
        )

        result = await send_whatsapp(phone, message, current_user)
        if result.get("sent"):
            await db.reminders_sent.insert_one({
                "id": str(uuid.uuid4()), "user_id": current_user["id"],
                "type": "birthday", "client_id": client["id"],
                "date": today_str, "sent_at": datetime.now(timezone.utc).isoformat()
            })
            sent += 1
        else:
            skipped += 1

    return {"sent": sent, "skipped": skipped, "total_checked": len(clients)}


@router.post("/reminders/birthday/{client_id}/mark-sent")
async def mark_birthday_sent(client_id: str, current_user: dict = Depends(get_current_user)):
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.reminders_sent.find_one({
        "user_id": current_user["id"], "type": "birthday",
        "client_id": client_id, "date": today_str
    })
    if not existing:
        await db.reminders_sent.insert_one({
            "id": str(uuid.uuid4()), "user_id": current_user["id"],
            "type": "birthday", "client_id": client_id, "date": today_str,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
    return {"success": True}


@router.post("/reminders/appointment/{appointment_id}/send-confirmation")
async def send_confirmation_link(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Genera il link di conferma SI/NO e restituisce l'URL WhatsApp pronto all'apertura."""
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    if apt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Appuntamento già cancellato")

    client_phone = apt.get("client_phone", "")
    if not client_phone and apt.get("client_id"):
        cl = await db.clients.find_one({"id": apt["client_id"], "user_id": current_user["id"]}, {"_id": 0})
        if cl:
            client_phone = cl.get("phone", "")
    if not client_phone:
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")

    token = apt.get("confirmation_token") or str(uuid.uuid4())
    await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["id"]},
        {"$set": {
            "confirmation_token": token,
            "confirmation_status": "pending",
            "confirmation_sent_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    frontend_url = os.environ.get("FRONTEND_URL", "https://brunomelitohair.it")
    confirm_link = f"{frontend_url}/conferma/{token}"
    services_text = ", ".join([s["name"] for s in apt.get("services", [])])
    message = (
        f"Ciao {apt.get('client_name', '')}! Ti ricordiamo il tuo appuntamento il "
        f"{_fmt_date_it(apt['date'])} alle {apt['time']} per {services_text}. "
        f"Conferma o disdici qui: {confirm_link}"
    )

    import urllib.parse
    wa_phone = normalize_phone_wa(client_phone)
    whatsapp_url = f"https://wa.me/{wa_phone}?text={urllib.parse.quote(message)}"

    # Usa il template Meta con data corretta (non "domani" hardcoded)
    from utils import send_automatic_message
    first_name = (apt.get('client_name') or '').split()[0] or 'cara cliente'
    result = await send_automatic_message(
        client_phone,
        "promemoria_appuntamento",
        [first_name, _fmt_date_it(apt['date']), apt['time']],
        message,
        current_user
    )
    if result.get("sent"):
        return {"success": True, "sent": True, "message": message, "client_phone": client_phone}

    return {"success": True, "sent": False, "whatsapp_url": whatsapp_url, "message": message, "client_phone": client_phone}


@router.post("/whatsapp/send-direct")
async def send_whatsapp_direct(data: dict, current_user: dict = Depends(get_current_user)):
    """Invia WhatsApp solo via Cloud API Meta (template approvato, poi testo libero)."""
    import urllib.parse

    phone = data.get("phone", "")
    message = data.get("message", "")
    if not phone or not message:
        raise HTTPException(status_code=400, detail="Phone e message obbligatori")

    phone_clean = normalize_phone_wa(phone)
    wa_url = f"https://wa.me/{phone_clean}?text={urllib.parse.quote(message)}"

    template_name = data.get("template_name")
    template_vars = data.get("template_vars") or []
    # Se c'è un template, NIENTE fallback a testo libero: il testo libero fuori dalla
    # finestra 24h risponde HTTP 200 senza consegnare (falso positivo) — meglio un
    # fallimento onesto che un "inviato" doppio/non recapitato.
    fallback = None if template_name else message
    result = await send_automatic_message(
        phone, template_name, template_vars, fallback_text=fallback, user=current_user
    )
    # send_automatic_message registra già la comunicazione internamente — non farlo di nuovo qui.

    if result.get("sent"):
        return {"sent": True, "method": result.get("method", "auto")}
    return {"sent": False, "method": "link", "url": wa_url, "error": result.get("error", "invio non riuscito")}


@router.get("/reminders/thank-you-template")
async def get_thank_you_template(current_user: dict = Depends(get_current_user)):
    """Restituisce il template di ringraziamento post-incasso."""
    tmpl = await db.message_templates.find_one(
        {"user_id": current_user["id"], "template_type": "thank_you"}, {"_id": 0, "user_id": 0}
    )
    if not tmpl:
        return {"text": "Ciao {nome}! Grazie per essere venuto da Bruno Melito Hair.\n\nTi aspettiamo presto per il tuo prossimo appuntamento!\n\nA presto!"}
    return {"text": tmpl.get("text", "")}


# ── Clienti inattivi ───────────────────────────────────────────────────────────

async def _get_service_type_for_personalization(services: list) -> str:
    """Identifica il tipo di servizio (colore, taglio, trattamento) da una lista di servizi.
    
    Ritorna: 'colore', 'taglio', 'trattamento', o None
    """
    if not services:
        return None
    
    color_keywords = ["colore", "color", "tinta", "meche", "balayage", "colpi di sole", "schiaritu"]
    cut_keywords = ["taglio", "cut", "piega"]
    treatment_keywords = ["trattamento", "maschera", "keratina", "olio", "laminazione", "anticaduta", "idratante"]
    
    for svc in services:
        svc_name = (svc.get("name") or "").lower()
        if any(kw in svc_name for kw in color_keywords):
            return "colore"
        elif any(kw in svc_name for kw in cut_keywords):
            return "taglio"
        elif any(kw in svc_name for kw in treatment_keywords):
            return "trattamento"
    return None


# ── Follow-up post-visita ─────────────────────────────────────────────────

@router.post("/reminders/follow-up/{appointment_id}")
async def send_followup_message(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Invia messaggio di follow-up post-visita per richiedere feedback/foto.
    
    Solo appuntamenti completati. Non richiede autenticazione speciale (staff/admin).
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # 1. Verifica appuntamento esiste e appartiene all'utente
    apt = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # 2. Verifica che sia completato
    if apt.get("status") != "completed":
        raise HTTPException(status_code=400, detail="L'appuntamento non è ancora completato")
    
    # 3. Verifica che il cliente abbia un numero WhatsApp
    client_phone = apt.get("client_phone")
    client_name = apt.get("client_name", "Cliente")
    if not client_phone:
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")
    
    # 4. Prepara messaggio di follow-up con richiesta feedback + suggerimento servizio
    first_name = client_name.split()[0] if client_name else "Cliente"
    service_names = ", ".join([s.get("name", "") for s in apt.get("services", [])])
    
    # Identifica tipo di servizio per suggerimento complementare
    last_service_type = await _get_service_type_for_personalization(apt.get("services", []))
    
    # Crea suggerimento di upsell in base al servizio appena ricevuto
    upsell_suggestion = ""
    if last_service_type == "taglio":
        upsell_suggestion = "\n\n💡 Prova il nostro colore senza ammoniaca con keratina per un look ancora più raffinato! 🎨"
    elif last_service_type == "colore":
        upsell_suggestion = "\n\n💡 Mantieni la luminosità del tuo colore con il nostro trattamento idratante 💧"
    elif last_service_type == "trattamento":
        upsell_suggestion = "\n\n💡 Abbina un nuovo taglio per esaltare al massimo i benefici del trattamento! ✂️"
    
    # 5. Tenta invio via template Meta (se disponibile), con fallback a testo
    fallback_message = (
        f"Ciao {first_name}! 🌟\n\n"
        f"Come è andata la tua visita per {service_names}? "
        f"Ci piacerebbe molto una tua foto — condividi il tuo nuovo look con noi! 📸\n\n"
        f"Grazie per la fiducia! A presto da Bruno Melito Hair 💇"
        f"{upsell_suggestion}"
    )
    
    result = await send_automatic_message(
        client_phone,
        template_name=None,  # Senza template fisso — usa feedback_request se esiste, altrimenti fallback testo
        template_vars=None,
        fallback_text=fallback_message,
        user=current_user
    )
    
    # 6. Registra l'invio nel log di comunicazioni
    if result.get("sent"):
        await db.communication_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "phone": client_phone,
            "type": "follow_up",
            "appointment_id": appointment_id,
            "message": fallback_message,
            "sent": True,
            "provider": result.get("method", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        return {
            "success": True,
            "message": f"Follow-up inviato a {client_name}",
            "provider": result.get("method", "unknown")
        }
    else:
        await db.communication_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "phone": client_phone,
            "type": "follow_up",
            "appointment_id": appointment_id,
            "message": fallback_message,
            "sent": False,
            "error": result.get("error", "Errore sconosciuto"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(
            status_code=400,
            detail=f"Errore invio follow-up: {result.get('error', 'Errore sconosciuto')}"
        )


# ── Upsell intelligente ────────────────────────────────────────────────────

@router.post("/reminders/upsell/{appointment_id}")
async def send_upsell_suggestion(
    appointment_id: str,
    service_suggestion: str,
    custom_message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Invia suggerimento di servizio complementare al cliente.
    
    Parametri:
    - service_suggestion: tipo di servizio da suggerire (es. "colore", "taglio", "trattamento")
    - custom_message (opzionale): messaggio personalizzato. Se non fornito, usa template automatico.
    """
    # 1. Verifica appuntamento
    apt = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    client_phone = apt.get("client_phone")
    client_name = apt.get("client_name", "Cliente")
    if not client_phone:
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")
    
    first_name = client_name.split()[0] if client_name else "Cliente"
    
    # 2. Generi il messaggio di upsell in base al servizio suggerito
    if custom_message:
        # Usa messaggio personalizzato da Bruno
        upsell_msg = custom_message
    else:
        # Template automatici per servizio
        service_suggestion_lower = service_suggestion.lower()
        
        templates_map = {
            "colore": (
                f"Ciao {first_name}! 🎨\n\n"
                f"Vuoi trasformare il tuo look con un colore senza ammoniaca con keratina e olio di argan? "
                f"Scopri come risalta il tuo stile!\n\n"
                f"Prenota il tuo colore esclusivo: https://brunomelitohair.it/prenota"
            ),
            "taglio": (
                f"Ciao {first_name}! ✂️\n\n"
                f"Un nuovo taglio = nuovo look! Scopri le ultime tendenze primavera-estate "
                f"e rinnova il tuo stile con noi.\n\n"
                f"Prenota il tuo taglio: https://brunomelitohair.it/prenota"
            ),
            "trattamento": (
                f"Ciao {first_name}! 💆\n\n"
                f"Vuoi capelli più idratati, lucidi e sani? Prova i nostri trattamenti "
                f"con keratina, olio di argan e acido ialuronico.\n\n"
                f"Prenota il tuo trattamento: https://brunomelitohair.it/prenota"
            ),
            "shampoo": (
                f"Ciao {first_name}! 🧴\n\n"
                f"Mantieni i benefici del nostro trattamento con lo shampoo specifico "
                f"senza parabeni e solfati. Disponibile in salone!\n\n"
                f"Contattaci: https://wa.me/+393397833526"
            ),
            "permanente": (
                f"Ciao {first_name}! 〰️\n\n"
                f"Vuoi capelli mossi e ondulati? La nostra permanente senza ammoniaca è delicata "
                f"e dona volume naturale.\n\n"
                f"Prenota: https://brunomelitohair.it/prenota"
            )
        }
        
        upsell_msg = templates_map.get(
            service_suggestion_lower,
            f"Ciao {first_name}! ✨ Scopri i nostri servizi esclusivi: https://brunomelitohair.it/prenota"
        )
    
    # 3. Invia messaggio via fallback chain
    result = await send_automatic_message(
        client_phone,
        template_name=None,
        template_vars=None,
        fallback_text=upsell_msg,
        user=current_user
    )
    
    # 4. Registra nel log
    if result.get("sent"):
        await db.communication_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "phone": client_phone,
            "type": "upsell",
            "appointment_id": appointment_id,
            "service_suggested": service_suggestion,
            "message": upsell_msg,
            "sent": True,
            "provider": result.get("method", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        return {
            "success": True,
            "message": f"Suggerimento di {service_suggestion} inviato a {client_name}",
            "provider": result.get("method", "unknown")
        }
    else:
        await db.communication_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "phone": client_phone,
            "type": "upsell",
            "appointment_id": appointment_id,
            "service_suggested": service_suggestion,
            "message": upsell_msg,
            "sent": False,
            "error": result.get("error", "Errore sconosciuto"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(
            status_code=400,
            detail=f"Errore invio upsell: {result.get('error', 'Errore sconosciuto')}"
        )


@router.get("/communication-logs")
async def get_communication_logs(
    limit: int = 100,
    only_failed: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Storico degli invii WhatsApp automatici: provider usato (`method`) ed esito (`sent`/`error`).
    Utile per capire perché un messaggio non è arrivato. `only_failed=true` mostra solo i falliti."""
    limit = max(1, min(limit, 500))
    query = {"user_id": current_user["id"]}
    if only_failed:
        query["sent"] = False
    logs = await db.communication_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"logs": logs, "count": len(logs)}
