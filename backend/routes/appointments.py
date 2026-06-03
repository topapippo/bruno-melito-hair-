from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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
        client_name = data.client_name.strip()
        client_phone = (data.client_phone or "").strip()
        # Riusa cliente esistente se nome già presente (unique index su user_id+name)
        existing = await db.clients.find_one(
            {"user_id": current_user["id"], "name": client_name},
            {"_id": 0, "id": 1, "phone": 1},
        )
        if existing:
            client_id = existing["id"]
            # Se il nuovo telefono è valorizzato e il cliente esistente non ne aveva, aggiornalo
            if client_phone and not existing.get("phone"):
                await db.clients.update_one(
                    {"id": client_id, "user_id": current_user["id"]},
                    {"$set": {"phone": client_phone}},
                )
        else:
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

        # 1. Notifica a Bruno
        notif_msg = (
            f"🔔 NUOVA PRENOTAZIONE!\n"
            f"👤 Cliente: {client_name}\n"
            f"📅 Data: {date_it}\n"
            f"⏰ Ora: {data.time}\n"
            f"✂️ Servizi: {service_names}\n\n"
            f"https://brunomelitohair.it/admin"
        )
        # Invio a Bruno (testo libero)
        await send_whatsapp(BRUNO_PHONE, notif_msg, current_user)

        # 2. Notifica alla Cliente: template promemoria
        if client_phone:
            client_fallback = (
                f"Ciao {client_name}! ✅ Prenotazione confermata da Bruno Melito Hair:\n\n"
                f"📅 {date_it} alle {data.time}\n"
                f"✂️ {service_names}\n\n"
                f"Ti aspettiamo! Per modifiche scrivici al 3397833526. 💇"
            )
            await send_automatic_message(
                client_phone,
                template_name="promemoria_appuntamento",
                template_vars=[client_name, date_it, data.time],
                fallback_text=client_fallback,
                user=current_user,
            )
    except Exception as e:
        logger.error(f"Errore generale notifiche creazione: {e}")

    return AppointmentResponse(**{k: v for k, v in appointment_doc.items() if k != "user_id"})

async def _send_checkout_thank_you(client_phone: str, client_name: str, current_user: dict):
    """Logica separata per invio ringraziamento post-incasso (per BackgroundTasks)."""
    try:
        # Recupera review link
        review_link = (
            current_user.get("google_review_link")
            or "https://www.google.com/search?q=Bruno+Melito+Hair+Stylist+Santa+Maria+Capua+Vetere"
        )
        
        # Testo di fallback per provider diversi da Meta Cloud
        ringr_text = (
            f"Ciao {client_name}! Grazie per essere venuta da Bruno Melito Hair. 💇\n\n"
            f"Se ti è piaciuto, ci aiuteresti tantissimo lasciando una recensione qui:\n{review_link}\n\n"
            f"A presto!"
        )
        
        # Invia usando la catena di fallback intelligente
        await send_automatic_message(
            client_phone,
            template_name="ringraziamento_visita",
            template_vars=[client_name, review_link],
            fallback_text=ringr_text,
            user=current_user,
        )
        logger.info(f"[CHECKOUT] Messaggio ringraziamento inviato a {client_phone}")
    except Exception as e:
        logger.error(f"[CHECKOUT] Errore invio ringraziamento: {e}")

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(
    appointment_id: str, 
    data: dict, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt: raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    payment_method = data.get("payment_method", "cash")
    total_paid = data.get("total_paid", apt["total_price"])
    card_id = data.get("card_id")

    # ── Pagamento con card/abbonamento ───────────────────────────────────────────
    card_info = None
    if payment_method == "prepaid" and card_id:
        card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"]}, {"_id": 0})
        if not card: raise HTTPException(status_code=404, detail="Card non trovata")
        
        deduct = float(total_paid or 0)
        updated = await db.cards.find_one_and_update(
            {"id": card_id, "user_id": current_user["id"], "active": True, "remaining_value": {"$gte": deduct}},
            {"$inc": {"remaining_value": -deduct, "used_services": 1}},
            return_document=True,
        )
        if not updated: raise HTTPException(status_code=409, detail="Credito insufficiente")
        
        if updated.get("remaining_value", 0) <= 0:
            await db.cards.update_one({"id": card_id}, {"$set": {"active": False}})
        
        card_info = {"card_name": updated.get("name", ""), "remaining_value": updated.get("remaining_value", 0)}

    # ── Salvataggio Pagamento ────────────────────────────────────────────────────
    payment_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "appointment_id": appointment_id,
        "client_id": apt["client_id"], "client_name": apt["client_name"],
        "total_paid": total_paid, "payment_method": payment_method,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": apt["services"]
    }
    await db.payments.insert_one(payment_doc)
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": "completed", "paid": True}})
    
    # ── Notifica Ringraziamento (Background) ─────────────────────────────────────
    # Se il telefono non è nell'appuntamento, cerchiamolo nel documento cliente
    phone = apt.get("client_phone")
    if not phone and apt.get("client_id"):
        client_doc = await db.clients.find_one({"id": apt["client_id"]}, {"phone": 1})
        if client_doc: phone = client_doc.get("phone")

    if phone:
        background_tasks.add_task(_send_checkout_thank_you, phone, apt["client_name"], current_user)
        
    return {"status": "ok", "payment_id": payment_doc["id"], "card": card_info}

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if date: query["date"] = date
    res = await db.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(1000)
    return [AppointmentResponse(**a) for a in res]

@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not res: raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    return AppointmentResponse(**res)

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if v is not None}
    
    if "service_ids" in update:
        ids = update.get("service_ids") or []
        services = await db.services.find(
            {"id": {"$in": ids}, "user_id": current_user["id"]},
            {"_id": 0, "user_id": 0},
        ).to_list(100)
        services_by_id = {s["id"]: s for s in services}
        ordered = [services_by_id[i] for i in ids if i in services_by_id]
        update["services"] = [
            {"id": s["id"], "name": s["name"], "duration": s.get("duration", 0), "price": s.get("price", 0)}
            for s in ordered
        ]
        update["total_duration"] = sum(s.get("duration", 0) for s in ordered)
        update["total_price"] = sum(s.get("price", 0) for s in ordered)

    if "operator_id" in update:
        op_id = update.get("operator_id")
        if op_id:
            op = await db.operators.find_one({"id": op_id, "user_id": current_user["id"]}, {"_id": 0})
            if op:
                update["operator_name"] = op["name"]
                update["operator_color"] = op.get("color")
        else:
            update["operator_name"] = None
            update["operator_color"] = None

    if "time" in update or "total_duration" in update:
        current = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
        if current:
            new_time = update.get("time", current.get("time"))
            new_dur = update.get("total_duration", current.get("total_duration", 0))
            if new_time:
                update["end_time"] = calculate_end_time(new_time, new_dur)

    await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"$set": update}
    )
    res = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return AppointmentResponse(**res)

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    await db.appointments.delete_one({"id": appointment_id, "user_id": current_user["id"]})
    return {"status": "ok"}
