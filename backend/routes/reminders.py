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
import asyncio
import logging

from database import db
from auth import get_current_user
from models import SMSRequest
from utils import (send_sms_reminder, twilio_client, TWILIO_PHONE_NUMBER,
                   normalize_phone_wa, send_whatsapp, send_whatsapp_cloud, WA_TOKEN)
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


# ============== SMS ==============

@router.post("/sms/send-reminder")
async def send_appointment_reminder(data: SMSRequest, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": data.appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    client = await db.clients.find_one({"id": appointment["client_id"], "user_id": current_user["id"]}, {"_id": 0})
    if not client or not client.get("phone"):
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")
    if not client.get("sms_reminder", True):
        raise HTTPException(status_code=400, detail="Cliente ha disabilitato promemoria SMS")
    from utils import WA_FOOTER
    services_text = ", ".join([s["name"] for s in appointment["services"]])
    default_message = f"Promemoria: hai un appuntamento il {_fmt_date_it(appointment['date'])} alle {appointment['time']} per {services_text}. Ti aspettiamo!" + WA_FOOTER
    message = data.message or default_message
    result = await send_sms_reminder(client["phone"], message, current_user["salon_name"])
    if result["success"]:
        await db.appointments.update_one({"id": data.appointment_id}, {"$set": {"sms_sent": True}})
        return {"success": True, "message": "SMS inviato con successo"}
    return {"success": False, "error": result.get("error", "Errore sconosciuto")}


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
    clients = {c["id"]: c for c in await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(100)}

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
            "days_ago": (datetime.now(timezone.utc) - datetime.strptime(r["last_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)).days,
            "phone": client_doc.get("phone", "") or r.get("client_phone", ""),
            "already_sent": r["_id"] in sent_client_ids or real_client_id in sent_client_ids
        })
    return output


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
            {"id": {"$in": missing_phone_ids}}, {"_id": 0, "id": 1, "phone": 1}
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
            {"id": {"$in": missing_phone_ids}}, {"_id": 0, "id": 1, "phone": 1}
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


# ============== INACTIVE CLIENTS ==============

@router.get("/reminders/inactive-clients")
async def get_inactive_clients(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%d")
    # Aggregation: ultima visita completata per ogni cliente — 1 query invece di N
    pipeline = [
        {"$match": {"user_id": uid, "status": "completed"}},
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$client_id",
            "last_date": {"$first": "$date"},
            "last_services": {"$first": "$services"}
        }}
    ]
    clients, last_apts_raw, recent_recalls = await asyncio.gather(
        db.clients.find({"user_id": uid}, {"_id": 0}).to_list(1000),
        db.appointments.aggregate(pipeline).to_list(5000),
        db.reminders_sent.find(
            {"user_id": uid, "type": "inactive_recall",
             "sent_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}},
            {"_id": 0}
        ).to_list(500)
    )
    last_apts = {a["_id"]: a for a in last_apts_raw}
    recently_recalled_ids = {r.get("client_id") for r in recent_recalls}
    today = datetime.now(timezone.utc)
    inactive = []
    for client in clients:
        last = last_apts.get(client["id"])
        if last and last["last_date"] <= cutoff_date:
            days_ago = (today - datetime.strptime(last["last_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)).days
            inactive.append({
                "client_id": client["id"], "client_name": client["name"],
                "client_phone": client.get("phone", ""), "last_visit": last["last_date"],
                "days_ago": days_ago,
                "last_services": [s.get("name", "") for s in last.get("last_services", [])],
                "already_recalled": client["id"] in recently_recalled_ids
            })
    inactive.sort(key=lambda x: x["days_ago"], reverse=True)
    return inactive


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
        cl = await db.clients.find_one({"id": apt["client_id"]}, {"_id": 0})
        if cl:
            client_phone = cl.get("phone", "")
    if not client_phone:
        raise HTTPException(status_code=400, detail="Cliente senza numero di telefono")

    token = apt.get("confirmation_token") or str(uuid.uuid4())
    await db.appointments.update_one(
        {"id": appointment_id},
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
    wa_phone = client_phone.replace(" ", "").replace("-", "")
    if wa_phone.startswith("0"):
        wa_phone = "39" + wa_phone[1:]
    elif wa_phone.startswith("+"):
        wa_phone = wa_phone[1:]
    elif not wa_phone.startswith("39"):
        wa_phone = "39" + wa_phone

    whatsapp_url = f"https://wa.me/{wa_phone}?text={urllib.parse.quote(message)}"

    # Tenta invio via send_whatsapp (Cloud API → UltraMsg → Green API)
    from utils import send_whatsapp
    result = await send_whatsapp(client_phone, message, current_user)
    if result.get("sent"):
        return {"success": True, "sent": True, "message": message, "client_phone": client_phone}

    return {"success": True, "sent": False, "whatsapp_url": whatsapp_url, "message": message, "client_phone": client_phone}


@router.post("/whatsapp/send-direct")
async def send_whatsapp_direct(data: dict, current_user: dict = Depends(get_current_user)):
    """Invia WhatsApp via Cloud API → UltraMsg → Green API (fallback legacy)."""
    import urllib.parse
    import asyncio
    import requests as _req

    phone = data.get("phone", "")
    message = data.get("message", "")
    if not phone or not message:
        raise HTTPException(status_code=400, detail="Phone e message obbligatori")

    phone_clean = normalize_phone_wa(phone)
    wa_number = phone_clean + "@c.us"
    wa_url = f"https://wa.me/{phone_clean}?text={urllib.parse.quote(message)}"

    # --- 1. WhatsApp Cloud API ufficiale Meta (provider principale) ---
    if WA_TOKEN:
        result = await send_whatsapp_cloud(phone, message)
        if result.get("sent"):
            return {"sent": True, "method": "cloud_api"}
        logger.warning(f"Cloud API failed: {result.get('error')} (code={result.get('code')})")

    quota_esaurita = False

    # --- 2. UltraMsg (legacy fallback) ---
    um_instance = current_user.get("ultramsg_instance_id", "")
    um_token = current_user.get("ultramsg_token", "")
    if um_instance and um_token:
        try:
            url = f"https://api.ultramsg.com/{um_instance}/messages/chat"
            resp = await asyncio.to_thread(
                _req.post, url,
                data={"token": um_token, "to": wa_number, "body": message},
                timeout=15
            )
            rjson = {}
            try:
                rjson = resp.json()
            except Exception:
                pass
            if resp.status_code == 200 and str(rjson.get("sent", "")).lower() == "true":
                return {"sent": True, "method": "ultramsg"}
            err = rjson.get("error") or rjson.get("message") or resp.text[:200]
            err_low = str(err).lower()
            if "limit" in err_low or "quota" in err_low or "exceeded" in err_low:
                quota_esaurita = True
                logger.warning("UltraMsg quota esaurita — provo Green API")
            else:
                logger.warning(f"UltraMsg failed {resp.status_code}: {err}")
        except Exception as e:
            logger.warning(f"UltraMsg exception: {e}")

    # --- 3. Green API (legacy fallback) ---
    instance_id = current_user.get("green_api_instance_id", "")
    api_token = current_user.get("green_api_token", "")
    if instance_id and api_token:
        try:
            url = f"https://api.greenapi.com/waInstance{instance_id}/sendMessage/{api_token}"
            resp = await asyncio.to_thread(
                _req.post, url,
                json={"chatId": wa_number, "message": message},
                timeout=15
            )
            rjson = {}
            try:
                rjson = resp.json()
            except Exception:
                pass
            if resp.status_code == 200 and rjson.get("idMessage"):
                return {"sent": True, "method": "greenapi"}
            logger.warning(f"Green API failed {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Green API exception: {e}")

    return {"sent": False, "method": "link", "url": wa_url,
            "error": "Nessun provider disponibile"}


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

async def _send_inactive_reminders_core(user: dict) -> dict:
    """Trova clienti inattivi da >60 giorni e manda WhatsApp. Ritorna stats."""
    user_id = user["id"]
    salon_name = user.get("salon_name", "Bruno Melito Hair")
    booking_url = "https://brunomelitohair.it/prenota"
    cutoff = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%Y-%m-%d")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Clienti con phone
    clients = await db.clients.find(
        {"user_id": user_id, "phone": {"$exists": True, "$ne": ""}},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).to_list(1000)

    sent = 0
    skipped = 0

    for client in clients:
        cid = client["id"]
        phone = client.get("phone", "")
        name = client.get("name", "")
        if not phone:
            continue

        # Ultimo appuntamento completato
        last_apt = await db.appointments.find_one(
            {"user_id": user_id, "client_id": cid, "status": "completed"},
            {"_id": 0, "date": 1},
            sort=[("date", -1)]
        )
        last_date = last_apt["date"] if last_apt else None

        # Salta se ha visitato di recente (< 60 giorni fa)
        if last_date and last_date >= cutoff:
            skipped += 1
            continue

        # Salta se non ha mai visitato (cliente nuovo non ancora venuto)
        if not last_date:
            skipped += 1
            continue

        # Salta se ha appuntamenti futuri
        future_apt = await db.appointments.find_one(
            {"user_id": user_id, "client_id": cid, "date": {"$gte": today},
             "status": {"$nin": ["cancelled"]}}
        )
        if future_apt:
            skipped += 1
            continue

        # Salta se già contattato negli ultimi 60 giorni
        already = await db.reminders_sent.find_one({
            "type": "inattivo", "client_id": cid, "user_id": user_id,
            "date": {"$gte": cutoff}
        })
        if already:
            skipped += 1
            continue

        first_name = name.split()[0] if name else "caro cliente"
        message = (
            f"Ciao {first_name}! 👋 Sono passati un po' di giorni dall'ultima volta da {salon_name}.\n"
            f"Ti aspettiamo per coccolarti di nuovo! 💇\n"
            f"Prenota il tuo appuntamento qui: {booking_url}"
        )

        result = await send_whatsapp(phone, message, user)
        if result.get("sent"):
            await db.reminders_sent.insert_one({
                "id": str(uuid.uuid4()), "type": "inattivo",
                "client_id": cid, "user_id": user_id,
                "date": today, "sent_at": datetime.now(timezone.utc).isoformat()
            })
            sent += 1
        else:
            skipped += 1

    return {"sent": sent, "skipped": skipped, "total": len(clients)}


@router.post("/reminders/inactive")
async def send_inactive_reminders(current_user: dict = Depends(get_current_user)):
    """Invia WhatsApp ai clienti che non vengono da più di 60 giorni."""
    result = await _send_inactive_reminders_core(current_user)
    return result


@router.get("/communication-logs")
async def get_communication_logs(
    limit: int = 100,
    only_failed: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Storico degli invii WhatsApp automatici: provider usato (`method`) ed esito (`sent`/`error`).
    Utile per capire perché un messaggio non è arrivato. `only_failed=true` mostra solo i falliti."""
    limit = max(1, min(limit, 500))
    query = {}
    if only_failed:
        query["sent"] = False
    logs = await db.communication_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"logs": logs, "count": len(logs)}
