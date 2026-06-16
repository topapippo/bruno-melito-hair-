import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse
from utils import calculate_end_time, send_whatsapp, send_automatic_message, resolve_client

router = APIRouter()
logger = logging.getLogger(__name__)


async def _send_checkout_thank_you(phone: str, client_name: str, current_user: dict):
    try:
        review_link = current_user.get("google_review_link") or "https://maps.app.goo.gl/8FdnYpnNyQcd78LQ7"
        message = (
            f"Ciao {client_name}! Grazie per essere venuta da Bruno Melito Hair. 💇\n\n"
            f"Se ti è piaciuto, ci aiuteresti tantissimo lasciando una recensione qui:\n{review_link}\n\n"
            f"A presto!"
        )
        await send_whatsapp(phone, message, current_user)
    except Exception as e:
        logger.error(f"Errore invio ringraziamento checkout: {e}")

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    client_name = ""
    client_phone = ""
    client_id = data.client_id or ""

    if data.client_id:
        client = await db.clients.find_one({"id": data.client_id, "user_id": current_user["id"]})
        if client:
            client_name = client["name"]
            client_phone = client.get("phone", "")
        else: raise HTTPException(status_code=404, detail="Cliente non trovato")
    elif data.client_name:
        # Find-or-create deduplicato per telefono normalizzato + nome esatto
        client_id, client_name, client_phone = await resolve_client(
            current_user["id"], data.client_name, data.client_phone
        )
    else: raise HTTPException(status_code=400, detail="Dati cliente mancanti")

    services_list = await db.services.find({"id": {"$in": data.service_ids}, "user_id": current_user["id"]}).to_list(100)
    
    operator_name = None
    operator_color = None
    if data.operator_id:
        op = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]})
        if op:
            operator_name = op["name"]
            operator_color = op.get("color")

    # Safe price and duration calculation
    total_duration = 0
    total_price = 0.0
    mapped_services = []
    for s in services_list:
        try:
            d = int(s.get("duration", 0))
            p = float(s.get("price", 0))
            total_duration += d
            total_price += p
            mapped_services.append({"id": s["id"], "name": s["name"], "duration": d, "price": p})
        except: continue

    end_time = calculate_end_time(data.time, total_duration)

    doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "client_id": client_id,
        "client_name": client_name, "client_phone": client_phone, "service_ids": data.service_ids,
        "services": mapped_services,
        "operator_id": data.operator_id, "operator_name": operator_name, "operator_color": operator_color,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "notes": data.notes or "", "source": "manual", "paid": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(doc)

    try:
        service_names = ", ".join([s["name"] for s in mapped_services])
        d_p = data.date.split('-')
        date_it = f"{d_p[2]}/{d_p[1]}/{d_p[0]}" if len(d_p) == 3 else data.date
        if client_phone:
            # Usa template di conferma per aumentare la probabilità di consegna
            asyncio.create_task(send_automatic_message(client_phone, "conferma_prenotazione", [client_name, date_it, data.time], f"Ciao {client_name}! ✅ Prenotazione confermata per il {date_it} alle {data.time}.", current_user))
    except Exception:
        pass

    return AppointmentResponse(**{k: v for k, v in doc.items() if k != "user_id"})

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(appointment_id: str, data: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
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
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": "completed", "paid": True}})
    phone = apt.get("client_phone")
    if not phone and apt.get("client_id"):
        cl = await db.clients.find_one({"id": apt["client_id"]})
        if cl: phone = cl.get("phone")
    if phone: background_tasks.add_task(_send_checkout_thank_you, phone, apt["client_name"], current_user)
    return {"status": "ok", "payment_id": payment_doc["id"]}

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if date: query["date"] = date
    res = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(1000)
    return [AppointmentResponse(**a) for a in res]

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if v is not None}
    if "service_ids" in update:
        services = await db.services.find({"id": {"$in": update["service_ids"]}, "user_id": current_user["id"]}).to_list(100)
        update["services"] = [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services]
        update["total_duration"] = sum(s["duration"] for s in services)
        update["total_price"] = sum(s["price"] for s in services)
    await db.appointments.update_one({"id": appointment_id, "user_id": current_user["id"]}, {"$set": update})
    res = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return AppointmentResponse(**res)

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    await db.appointments.delete_one({"id": appointment_id, "user_id": current_user["id"]})
    return {"status": "ok"}
