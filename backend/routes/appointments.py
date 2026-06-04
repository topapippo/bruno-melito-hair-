from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse
from utils import calculate_end_time, send_whatsapp, send_automatic_message

router = APIRouter()
logger = logging.getLogger(__name__)

BRUNO_PHONE = "3397833526"

async def _send_checkout_thank_you(phone: str, client_name: str, current_user: dict):
    """Esegue l'invio del messaggio di ringraziamento in background."""
    try:
        # Recupera il link recensioni personalizzato dell'utente
        review_link = current_user.get("google_review_link") or "https://maps.app.goo.gl/8FdnYpnNyQcd78LQ7"
        
        # Testo del messaggio
        message = (
            f"Ciao {client_name}! Grazie per essere venuta da Bruno Melito Hair. 💇\n\n"
            f"Se ti è piaciuto, ci aiuteresti tantissimo lasciando una recensione qui:\n{review_link}\n\n"
            f"A presto!"
        )
        
        # Invia con logica intelligente (usa template ringraziamento_visita se Meta Cloud, altrimenti testo libero)
        await send_whatsapp(phone, message, current_user)
        logger.info(f"[WA AUTO] Ringraziamento inviato a {phone} per {client_name}")
    except Exception as e:
        logger.error(f"[WA AUTO] Errore invio ringraziamento checkout: {e}")

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
        client_name = data.client_name.strip()
        client_phone = (data.client_phone or "").strip()
        client_id = str(uuid.uuid4())
        await db.clients.insert_one({
            "id": client_id, "user_id": current_user["id"], "name": client_name, "phone": client_phone,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else: raise HTTPException(status_code=400, detail="Dati cliente mancanti")

    services = await db.services.find({"id": {"$in": data.service_ids}, "user_id": current_user["id"]}).to_list(100)
    operator_name = None
    if data.operator_id:
        op = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]})
        if op: operator_name = op["name"]

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    end_time = calculate_end_time(data.time, total_duration)

    doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "client_id": client_id,
        "client_name": client_name, "client_phone": client_phone, "service_ids": data.service_ids,
        "services": [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services],
        "operator_id": data.operator_id, "operator_name": operator_name,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "notes": data.notes or "", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(doc)

    # Notifica creazione (non blocca risposta)
    try:
        msg = f"🔔 NUOVA PRENOTAZIONE!\n👤 {client_name}\n📅 {data.date} ore {data.time}\n\nhttps://brunomelitohair.it/admin"
        asyncio.create_task(send_whatsapp(BRUNO_PHONE, msg, current_user))
        if client_phone:
            asyncio.create_task(send_whatsapp(client_phone, f"Ciao {client_name}! ✅ Prenotazione confermata per il {data.date} alle {data.time}.", current_user))
    except: pass

    return AppointmentResponse(**{k: v for k, v in doc.items() if k != "user_id"})

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(appointment_id: str, data: dict, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt: raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    # Salvataggio pagamento
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

    # Recupero telefono cliente per ringraziamento
    phone = apt.get("client_phone")
    if not phone:
        client = await db.clients.find_one({"id": apt["client_id"]})
        if client: phone = client.get("phone")

    if phone:
        # IMPORTANTE: Usiamo BackgroundTasks per garantire l'invio post-risposta
        background_tasks.add_task(_send_checkout_thank_you, phone, apt["client_name"], current_user)
        logger.info(f"[CHECKOUT] Task ringraziamento aggiunto per {phone}")

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
