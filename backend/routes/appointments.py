from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse
from utils import calculate_end_time, send_whatsapp, send_whatsapp_cloud, send_whatsapp_template, send_automatic_message

router = APIRouter()
logger = logging.getLogger(__name__)

BRUNO_PHONE = "3397833526"

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    client_name = ""
    client_phone = ""
    client_id = data.client_id or ""

    if data.client_id:
        client = await db.clients.find_one({"id": data.client_id, "user_id": current_user["id"]}, {"_id": 0})
        if client:
            client_name = client["name"]
            client_phone = client.get("phone", "")
        else:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
    elif data.client_name:
        client_name = data.client_name
        client_phone = data.client_phone or ""
        client_id = str(uuid.uuid4())
        await db.clients.insert_one({
            "id": client_id, "user_id": current_user["id"], "name": client_name, "phone": client_phone,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        raise HTTPException(status_code=400, detail="Specificare un cliente")

    services = await db.services.find({"id": {"$in": data.service_ids}, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0}).to_list(100)
    
    operator_name = None
    if data.operator_id:
        op = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]}, {"_id": 0})
        if op: operator_name = op["name"]

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    end_time = calculate_end_time(data.time, total_duration)

    appointment_id = str(uuid.uuid4())
    appointment_doc = {
        "id": appointment_id, "user_id": current_user["id"],
        "client_id": client_id, "client_name": client_name, "client_phone": client_phone,
        "service_ids": data.service_ids,
        "services": [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services],
        "operator_id": data.operator_id, "operator_name": operator_name,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "notes": data.notes or "", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment_doc)

    # --- INVIO NOTIFICHE AUTOMATICHE ---
    try:
        service_names = ", ".join([s["name"] for s in services])
        d_parts = data.date.split('-')
        date_it = f"{d_parts[2]}/{d_parts[1]}/{d_parts[0]}" if len(d_parts) == 3 else data.date

        # 1. Notifica a Bruno (testo libero — fallback chain UltraMsg/Green API)
        notif_msg = (
            f"🔔 NUOVA PRENOTAZIONE!\n"
            f"👤 Cliente: {client_name}\n"
            f"📅 Data: {date_it}\n"
            f"⏰ Ora: {data.time}\n"
            f"✂️ Servizi: {service_names}\n\n"
            f"https://brunomelitohair.it/admin"
        )
        await send_automatic_message(
            BRUNO_PHONE,
            template_name=None,
            fallback_text=notif_msg,
            user=current_user,
        )

        # 2. Notifica alla Cliente: template promemoria approvato + fallback UltraMsg/Green API
        if client_phone:
            client_fallback = (
                f"Ciao {client_name}! ✅ Prenotazione confermata da Bruno Melito Hair:\n\n"
                f"📅 {date_it} alle {data.time}\n"
                f"✂️ {service_names}\n\n"
                f"Ti aspettiamo! Per modifiche scrivici al 3397833526. 💇"
            )
            wa_result = await send_automatic_message(
                client_phone,
                template_name="promemoria_appuntamento",
                template_vars=[client_name, date_it, data.time],
                fallback_text=client_fallback,
                user=current_user,
            )
            if wa_result.get("sent"):
                logger.info(f"Conferma inviata a {client_name} ({client_phone}) via {wa_result.get('method')}")
            else:
                logger.error(f"Conferma FALLITA a {client_phone}: {wa_result.get('error')}")
    except Exception as e:
        logger.error(f"Errore generale notifiche: {e}")

    return AppointmentResponse(**{k: v for k, v in appointment_doc.items() if k != "user_id"})

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt: raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    payment_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "appointment_id": appointment_id,
        "client_id": apt["client_id"], "client_name": apt["client_name"],
        "total_paid": data.get("total_paid", apt["total_price"]),
        "payment_method": data.get("payment_method", "cash"),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": apt["services"]
    }
    await db.payments.insert_one(payment_doc)
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": "completed"}})
    
    # Notifica Ringraziamento (template + fallback UltraMsg/Green API)
    if apt.get("client_phone"):
        try:
            review_link = current_user.get("google_review_link", "https://brunomelitohair.it")
            ringr_text = (
                f"Ciao {apt['client_name']}! Grazie per essere venuta da Bruno Melito Hair. 💇\n\n"
                f"Se ti è piaciuto, ci aiuteresti tantissimo lasciando una recensione qui:\n{review_link}\n\n"
                f"A presto!"
            )
            await send_automatic_message(
                apt["client_phone"],
                template_name="ringraziamento_visita",
                template_vars=[apt["client_name"], review_link],
                fallback_text=ringr_text,
                user=current_user,
            )
        except Exception as e:
            logger.error(f"Errore ringraziamento checkout: {e}")
        
    return {"status": "ok", "payment_id": payment_doc["id"]}

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if date: query["date"] = date
    res = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(500)
    return [AppointmentResponse(**a) for a in res]

@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not res: raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    return AppointmentResponse(**res)

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    await db.appointments.update_one({"id": appointment_id, "user_id": current_user["id"]}, {"$set": data})
    res = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return AppointmentResponse(**res)

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    await db.appointments.delete_one({"id": appointment_id, "user_id": current_user["id"]})
    return {"status": "ok"}
