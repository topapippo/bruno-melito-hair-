from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse
from utils import calculate_end_time, send_whatsapp, send_whatsapp_template

router = APIRouter()
logger = logging.getLogger(__name__)

# Numero di Bruno per le notifiche
BRUNO_PHONE = "3397833526"

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    client_name = ""
    client_phone = ""
    client_id = data.client_id or ""

    try:
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
            generic_names = ["cliente generico", "cliente occasionale"]
            if client_name.lower().strip() not in generic_names:
                new_client_id = str(uuid.uuid4())
                new_client = {
                    "id": new_client_id, "user_id": current_user["id"],
                    "name": client_name, "phone": client_phone, "hair_notes": "",
                    "send_sms_reminders": False, "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.clients.insert_one(new_client)
                client_id = new_client_id
            else:
                client_id = "generic"
        else:
            raise HTTPException(status_code=400, detail="Specificare un cliente")
    except HTTPException: raise
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

    services = await db.services.find({"id": {"$in": data.service_ids}, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0}).to_list(100)
    
    operator_name = None
    operator_color = None
    if data.operator_id:
        op = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]}, {"_id": 0})
        if op:
            operator_name = op["name"]
            operator_color = op.get("color", "#C58970")

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    end_time = calculate_end_time(data.time, total_duration)

    appointment_id = str(uuid.uuid4())
    appointment_doc = {
        "id": appointment_id, "user_id": current_user["id"],
        "client_id": client_id, "client_name": client_name, "client_phone": client_phone,
        "service_ids": data.service_ids,
        "services": [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services],
        "operator_id": data.operator_id, "operator_name": operator_name, "operator_color": operator_color,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "notes": data.notes or "", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment_doc)

    # --- NOTIFICA WHATSAPP A BRUNO ---
    try:
        service_names = ", ".join([s["name"] for s in services])
        notif_msg = f"🔔 NUOVA PRENOTAZIONE!\n👤 Cliente: {client_name}\n📅 Data: {data.date}\n⏰ Ora: {data.time}\n✂️ Servizi: {service_names}\n\nGestiscila qui: https://brunomelitohair.it/admin"
        await send_whatsapp(BRUNO_PHONE, notif_msg, current_user)
    except Exception as e:
        logger.error(f"Errore notifica Bruno: {e}")

    # --- NOTIFICA ALLA CLIENTE (Template) ---
    if client_phone:
        try:
            # Usa il template ufficiale approvato
            await send_whatsapp_template(client_phone, "conferma_prenotazione", [client_name, data.date, data.time])
        except: pass

    return AppointmentResponse(**{k: v for k, v in appointment_doc.items() if k != "user_id"})

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
