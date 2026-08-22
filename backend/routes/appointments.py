import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from calendar import monthrange
from pydantic import BaseModel
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse
from utils import calculate_end_time, send_whatsapp, send_automatic_message, resolve_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Modello Cassa Sicuro e Semplice (per evitare errori 500)
class SafeCheckoutData(BaseModel):
    payment_method: Optional[str] = "cash"
    discount_type: Optional[str] = "none"
    discount_value: Optional[float] = 0
    total_paid: float
    card_id: Optional[str] = None
    note: Optional[str] = None
    custom_services: Optional[List[dict]] = None
    retail_items: Optional[List[dict]] = None


async def _send_checkout_thank_you(phone: str, client_name: str, current_user: dict, payment_id: str = None):
    try:
        review_link = current_user.get("google_review_link") or "https://maps.app.goo.gl/8FdnYpnNyQcd78LQ7"
        message = f"Ciao {client_name}! Grazie per essere venuta da Bruno Melito Hair. 💇\n\n"
        if payment_id:
            message += f"Ecco la tua ricevuta digitale: https://brunomelitohair.it/ricevuta/{payment_id}\n\n"
        message += f"Se ti è piaciuto, ci aiuteresti tantissimo lasciando una recensione qui:\n{review_link}\n\nA presto!"
        await send_automatic_message(phone, "ringraziamento_e_ricevuta", [client_name], message, current_user, button_param=payment_id)
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
            asyncio.create_task(send_automatic_message(client_phone, "conferma_prenotazione", [client_name, date_it, data.time], f"Ciao {client_name}! ✓ Prenotazione confermata per il {date_it} alle {data.time}.", current_user))
    except Exception:
        pass

    return AppointmentResponse(**{k: v for k, v in doc.items() if k != "user_id"})

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(appointment_id: str, data: CheckoutData, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt: raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    card_id = data.card_id
    card_result = None
    card_type_used = None

    # 1. GESTIONE SERVIZI MODIFICATI (Prezzi e Quantità)
    if data.custom_services:
        final_services = [
            {"id": s.get("id"), "name": s.get("name"), "price": s.get("price"), "quantity": s.get("quantity", 1), "duration": s.get("duration", 0)}
            for s in data.custom_services
        ]
        await db.appointments.update_one(
            {"id": appointment_id, "user_id": current_user["id"]},
            {"$set": {"services": final_services, "total_price": data.total_paid}}
        )
        apt["services"] = final_services

    # 2. GESTIONE CARD/ABBONAMENTO
    if card_id:
        card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"]}, {"_id": 0})
        if card and card.get("active"):
            card_type_used = card.get("card_type")
            amount_to_deduct = data.total_paid if card_type_used != "subscription" else 0.0
            transaction = {
                "id": str(uuid.uuid4()),
                "amount": amount_to_deduct,
                "appointment_id": appointment_id,
                "description": f"Servizio scalato — {apt.get('client_name', '')}",
                "date": datetime.now(timezone.utc).isoformat()
            }
            if card_type_used == "subscription":
                services_count = len(apt.get("services", [])) or 1
                updated_card = await db.cards.find_one_and_update(
                    {"id": card_id, "user_id": current_user["id"], "active": True},
                    {"$inc": {"used_services": services_count}, "$push": {"transactions": transaction}},
                    return_document=True
                )
            else:
                updated_card = await db.cards.find_one_and_update(
                    {"id": card_id, "user_id": current_user["id"], "active": True, "remaining_value": {"$gte": amount_to_deduct}},
                    {"$inc": {"remaining_value": -amount_to_deduct, "used_services": 1}, "$push": {"transactions": transaction}},
                    return_document=True
                )
            if updated_card:
                used = updated_card.get("used_services", 0)
                total_svc = updated_card.get("total_services")
                remaining_val = updated_card.get("remaining_value", 0)
                is_exhausted = remaining_val <= 0
                if total_svc:
                    is_exhausted = is_exhausted or used >= total_svc
                if is_exhausted:
                    await db.cards.update_one({"id": card_id, "user_id": current_user["id"]}, {"$set": {"active": False}})
                card_result = {
                    "card_id": card_id,
                    "card_active": not is_exhausted,
                    "remaining_value": remaining_val,
                    "used_services": used,
                }

    # 3. REGISTRAZIONE PAGAMENTO
    total_paid_amount = 0.0 if card_type_used == "subscription" else data.total_paid
    payment_type = "subscription_checkout" if card_type_used == "subscription" else "prepaid_checkout" if card_type_used == "prepaid" else data.payment_method

    payment_doc = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "appointment_id": appointment_id,
        "client_id": apt["client_id"], "client_name": apt["client_name"],
        "total_paid": total_paid_amount,
        "payment_method": data.payment_method,
        "payment_type": payment_type,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": apt["services"],
        "card_id": card_id,
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "note": data.note,
    }
    await db.payments.insert_one(payment_doc)

    await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["id"]}, 
        {"$set": {"status": "completed", "paid": True, "payment_method": data.payment_method}}
    )

    # 4. SCARICO MAGAZZINO
    retail_items = getattr(data, 'retail_items', None) or []
    for item in retail_items:
        prod_id = item.get("product_id")
        qty = abs(item.get("quantity", 1))
        if prod_id:
            await db.inventory.update_one(
                {"id": prod_id, "user_id": current_user["id"]},
                {"$inc": {"total_stock": -qty}}
            )

    service_ids = [s.get("id") for s in apt.get("services", []) if s.get("id")]
    if service_ids:
        db_services = await db.services.find(
            {"id": {"$in": service_ids}, "user_id": current_user["id"]}
        ).to_list(100)

        client_doc = await db.clients.find_one(
            {"id": apt.get("client_id"), "user_id": current_user["id"]}, 
            {"_id": 0}
        ) if apt.get("client_id") else None

        for db_svc in db_services:
            category = (db_svc.get("category") or "").lower()

            if "colore" in category:
                if client_doc and client_doc.get("current_color_code"):
                    color_codes = [c.strip() for c in str(client_doc["current_color_code"]).split(',') if c.strip()]
                    for color_code in color_codes:
                        inv_prod = await db.inventory.find_one({"user_id": current_user["id"], "name": color_code})
                        if inv_prod:
                            await db.inventory.update_one(
                                {"id": inv_prod["id"], "user_id": current_user["id"]},
                                {"$inc": {"total_stock": -abs(inv_prod.get("dose_size", 1.0))}}
                            )

            elif any(x in category for x in ["trattamento", "permanente", "stiratura"]) and db_svc.get("linked_inventory_id"):
                inv_id = db_svc["linked_inventory_id"]
                inv_prod = await db.inventory.find_one({"id": inv_id, "user_id": current_user["id"]})
                if inv_prod:
                    await db.inventory.update_one(
                        {"id": inv_prod["id"], "user_id": current_user["id"]},
                        {"$inc": {"total_stock": -abs(inv_prod.get("dose_size", 1.0))}}
                    )

    # 5. MESSAGGIO WHATSAPP
    phone = apt.get("client_phone")
    if not phone and apt.get("client_id"):
        cl = await db.clients.find_one({"id": apt["client_id"], "user_id": current_user["id"]})
        if cl: phone = cl.get("phone")
    if phone: 
        background_tasks.add_task(_send_checkout_thank_you, phone, apt["client_name"], current_user, payment_doc["id"])
    
    return {"status": "ok", "payment_id": payment_doc["id"], "card": card_result}
@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    date: Optional[str] = None,
    month: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif month:
        try:
            y, m = map(int, month.split('-'))
            last_day = monthrange(y, m)[1]
        except Exception:
            last_day = 31
        query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-{last_day:02d}"}
    res = await db.appointments.find(query, {"_id": 0}).sort([("date", 1), ("time", 1)]).to_list(5000)
    return [AppointmentResponse(**a) for a in res]

ALLOWED_APPOINTMENT_UPDATE_FIELDS = {"date", "time", "operator_id", "service_ids", "notes", "promo_id", "card_id"}

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if k in ALLOWED_APPOINTMENT_UPDATE_FIELDS and v is not None}
    if "service_ids" in update:
        services = await db.services.find({"id": {"$in": update["service_ids"]}, "user_id": current_user["id"]}).to_list(100)
        update["services"] = [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"]} for s in services]
        update["total_duration"] = sum(s["duration"] for s in services)
        update["total_price"] = sum(s["price"] for s in services)
    await db.appointments.update_one({"id": appointment_id, "user_id": current_user["id"]}, {"$set": update})
    res = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    return AppointmentResponse(**res)

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    await db.appointments.delete_one({"id": appointment_id, "user_id": current_user["id"]})
    return {"status": "ok"}

@router.post("/appointments/recurring")
async def create_recurring_appointments(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    appointment_id = data.get("appointment_id")
    repeat_count = data.get("repeat_count", 4)
    repeat_weeks = data.get("repeat_weeks", 0)
    repeat_months = data.get("repeat_months", 0)

    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]})
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    from datetime import datetime as dt
    date_str = apt["date"]
    base_date = None
    for fmt in ["%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"]:
        try:
            base_date = dt.strptime(date_str, fmt)
            break
        except ValueError:
            continue
    if not base_date:
        raise ValueError(f"Formato data non riconosciuto: {date_str}")
    created_count = 0

    for i in range(1, repeat_count + 1):
        if repeat_weeks > 0:
            new_date = base_date + timedelta(weeks=repeat_weeks * i)
        else:
            y, m = base_date.year, base_date.month
            m += repeat_months * i
            while m > 12:
                y += 1
                m -= 12
            day = min(base_date.day, monthrange(y, m)[1])
            new_date = base_date.replace(year=y, month=m, day=day)

        new_apt = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "client_id": apt["client_id"],
            "client_name": apt["client_name"],
            "client_phone": apt.get("client_phone", ""),
            "date": new_date.strftime("%d/%m/%Y"),
            "time": apt["time"],
            "service_ids": [s["id"] for s in apt["services"]],
            "services": apt["services"],
            "total_duration": apt["total_duration"],
            "total_price": apt["total_price"],
            "operator_id": apt.get("operator_id"),
            "operator_name": apt.get("operator_name"),
            "notes": apt.get("notes", ""),
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "paid": False
        }
        await db.appointments.insert_one(new_apt)
        created_count += 1

    return {"created": created_count}