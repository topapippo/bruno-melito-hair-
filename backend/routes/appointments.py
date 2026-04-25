from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from database import db
from auth import get_current_user
from models import (
    AppointmentCreate, AppointmentResponse, AppointmentUpdate,
    RecurringAppointmentCreate, CheckoutData, get_loyalty_rewards, LOYALTY_POINTS_PER_EURO
)
from utils import calculate_end_time

router = APIRouter()
logger = logging.getLogger("routes.appointments")



def _infer_category_from_name(name: str) -> str:
    """Infer service category from its name using keyword matching."""
    n = name.lower()
    if any(k in n for k in ["colore", "meches", "tinta", "shatush", "balayage", "decoloraz", "rifless", "copertura"]):
        return "colore"
    if any(k in n for k in ["permanente", "arricciatura", "ondulazione"]):
        return "permanente"
    if any(k in n for k in ["stiratura", "lisciatura", "lisciante"]):
        return "stiratura"
    if any(k in n for k in ["trattamento", "cheratina", "ricostruz", "maschera", "ristruttur", "olaplex", "botox"]):
        return "trattamento"
    if any(k in n for k in ["taglio", "piega", "rasatura", "sfumatura", "barba", "spuntat", "messa in piega", "finish", "asciugatura", "piastra", "arricciacapelli"]):
        return "taglio"
    if any(k in n for k in ["abbonamento", "pacchetto", "tessera"]):
        return "abbonamento"
    return "altro"



# ============== Loyalty helpers (used by checkout) ==============

async def get_or_create_loyalty(client_id: str, user_id: str):
    loyalty = await db.loyalty.find_one({"client_id": client_id, "user_id": user_id}, {"_id": 0})
    if not loyalty:
        loyalty = {
            "id": str(uuid.uuid4()), "client_id": client_id, "user_id": user_id,
            "points": 0, "total_points_earned": 0, "total_points_redeemed": 0,
            "history": [], "active_rewards": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.loyalty.insert_one(loyalty)
        loyalty.pop("_id", None)
    return loyalty


async def award_loyalty_points(client_id: str, user_id: str, amount_paid: float, appointment_id: str):
    points_earned = int(amount_paid // LOYALTY_POINTS_PER_EURO)
    if points_earned <= 0:
        return 0
    loyalty = await get_or_create_loyalty(client_id, user_id)
    history_entry = {
        "id": str(uuid.uuid4()), "type": "earned", "points": points_earned,
        "description": f"+{points_earned} punti per pagamento di €{amount_paid:.2f}",
        "appointment_id": appointment_id, "date": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty.update_one(
        {"id": loyalty["id"]},
        {"$inc": {"points": points_earned, "total_points_earned": points_earned},
         "$push": {"history": history_entry}}
    )
    return points_earned


# ============== CRUD ==============

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
                    "name": client_name, "phone": client_phone, "notes": "",
                    "send_sms_reminders": False, "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.clients.insert_one(new_client)
                client_id = new_client_id
            else:
                client_id = "generic"
        else:
            raise HTTPException(status_code=400, detail="Specificare un cliente")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore risoluzione cliente: {e}")
        raise HTTPException(status_code=500, detail=f"Errore risoluzione cliente: {str(e)}")

    services = await db.services.find(
        {"id": {"$in": data.service_ids}, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).to_list(100)
    if len(services) != len(data.service_ids):
        raise HTTPException(status_code=404, detail="Uno o più servizi non trovati")

    operator_name = None
    operator_color = None
    if data.operator_id:
        operator = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]}, {"_id": 0})
        if operator:
            operator_name = operator["name"]
            operator_color = operator.get("color", "#C58970")
    else:
        # Auto-assign to MBHS operator if no operator specified
        mbhs = await db.operators.find_one({"user_id": current_user["id"], "active": True}, {"_id": 0}, sort=[("name", 1)])
        if mbhs:
            data.operator_id = mbhs["id"]
            operator_name = mbhs["name"]
            operator_color = mbhs.get("color", "#C58970")

    total_duration = sum(s["duration"] for s in services)
    total_price = sum(s["price"] for s in services)
    end_time = calculate_end_time(data.time, total_duration)

    # Auto-assign to another operator if conflict at same time
    if data.operator_id:
        def time_to_min(t):
            h, m = t.split(':')
            return int(h) * 60 + int(m)
        new_start = time_to_min(data.time)
        new_end = new_start + total_duration

        # Get ALL non-cancelled appointments for this day and operator
        existing_apts = await db.appointments.find({
            "user_id": current_user["id"],
            "date": data.date,
            "operator_id": data.operator_id,
            "status": {"$nin": ["cancelled"]},
        }, {"_id": 0, "time": 1, "total_duration": 1}).to_list(100)

        has_conflict = False
        for existing in existing_apts:
            c_start = time_to_min(existing["time"])
            c_end = c_start + (existing.get("total_duration") or 15)
            if new_start < c_end and new_end > c_start:
                has_conflict = True
                break

        if has_conflict:
            all_ops = await db.operators.find({"user_id": current_user["id"], "active": True}, {"_id": 0}).to_list(20)
            for alt_op in all_ops:
                if alt_op["id"] == data.operator_id:
                    continue
                # Check if alt operator has any overlap
                alt_apts = await db.appointments.find({
                    "user_id": current_user["id"],
                    "date": data.date,
                    "operator_id": alt_op["id"],
                    "status": {"$nin": ["cancelled"]},
                }, {"_id": 0, "time": 1, "total_duration": 1}).to_list(100)
                alt_conflict = False
                for aa in alt_apts:
                    aa_start = time_to_min(aa["time"])
                    aa_end = aa_start + (aa.get("total_duration") or 15)
                    if new_start < aa_end and new_end > aa_start:
                        alt_conflict = True
                        break
                if not alt_conflict:
                    data.operator_id = alt_op["id"]
                    operator_name = alt_op["name"]
                    operator_color = alt_op.get("color", "#C58970")
                    logger.info(f"Auto-assegnato operatore {alt_op['name']} per conflitto orario")
                    break

    appointment_id = str(uuid.uuid4())
    
    # Resolve promo and card names
    promo_name = None
    card_name = None
    if data.promo_id:
        promo = await db.promotions.find_one({"id": data.promo_id, "user_id": current_user["id"]}, {"_id": 0, "name": 1})
        promo_name = promo["name"] if promo else None
    if data.card_id:
        card = await db.cards.find_one({"id": data.card_id}, {"_id": 0, "name": 1})
        card_name = card["name"] if card else None
    
    appointment_doc = {
        "id": appointment_id, "user_id": current_user["id"],
        "client_id": client_id, "client_name": client_name, "client_phone": client_phone,
        "service_ids": data.service_ids,
        "services": [{"id": s["id"], "name": s["name"], "duration": s["duration"], "price": s["price"], "category": s.get("category", "")} for s in services],
        "operator_id": data.operator_id, "operator_name": operator_name, "operator_color": operator_color,
        "date": data.date, "time": data.time, "end_time": end_time,
        "total_duration": total_duration, "total_price": total_price,
        "status": "scheduled", "notes": data.notes or "", "sms_sent": False,
        "promo_id": data.promo_id, "promo_name": promo_name,
        "card_id": data.card_id, "card_name": card_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointments.insert_one(appointment_doc)
    return AppointmentResponse(**{k: v for k, v in appointment_doc.items() if k != "user_id"})


@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    date: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None,
    status: Optional[str] = None, operator_id: Optional[str] = None,
    page: int = 1, limit: int = 200,
    current_user: dict = Depends(get_current_user)
):
    limit = min(limit, 500)
    skip = (page - 1) * limit
    query = {"user_id": current_user["id"]}
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    if status:
        query["status"] = status
    if operator_id:
        query["operator_id"] = operator_id
    appointments = await db.appointments.find(
        query, {"_id": 0, "user_id": 0}
    ).sort([("date", 1), ("time", 1)]).skip(skip).to_list(limit)

    # Sync service names, categories, and prices from master services list
    master = await db.services.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(1000)
    master_by_id = {s["id"]: s for s in master}

    for apt in appointments:
        for svc in (apt.get("services") or []):
            ms = master_by_id.get(svc.get("id", ""))
            if ms:
                svc["name"] = ms.get("name", svc.get("name", ""))
                svc["category"] = ms.get("category", svc.get("category", ""))
                svc["price"] = ms.get("price", svc.get("price", 0))
                svc["duration"] = ms.get("duration", svc.get("duration", 15))
            elif not svc.get("category"):
                svc["category"] = _infer_category_from_name(svc.get("name", ""))

    return appointments


@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    return appointment


@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, data: AppointmentUpdate, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    update_data = {}
    if data.client_id:
        client = await db.clients.find_one({"id": data.client_id, "user_id": current_user["id"]}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        update_data["client_id"] = data.client_id
        update_data["client_name"] = client["name"]
        update_data["client_phone"] = client.get("phone", "")

    if data.service_ids:
        # Preserve existing service data (including upselling discounts) for unchanged services.
        # Only re-fetch from catalog for service IDs that are NEW (not already in the appointment).
        existing_svc_map = {s["id"]: s for s in appointment.get("services", [])}
        truly_new_ids = [sid for sid in data.service_ids if sid not in existing_svc_map]

        fetched_new = {}
        if truly_new_ids:
            new_from_catalog = await db.services.find(
                {"id": {"$in": truly_new_ids}, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
            ).to_list(100)
            if len(new_from_catalog) != len(truly_new_ids):
                raise HTTPException(status_code=404, detail="Uno o più servizi non trovati")
            fetched_new = {s["id"]: s for s in new_from_catalog}

        ordered = []
        for sid in data.service_ids:
            if sid in existing_svc_map:
                ordered.append(existing_svc_map[sid])  # preserves upselling discount
            elif sid in fetched_new:
                s = fetched_new[sid]
                ordered.append({"id": s["id"], "name": s["name"], "duration": s["duration"],
                                 "price": s["price"], "category": s.get("category", "")})

        update_data["service_ids"] = data.service_ids
        update_data["services"] = ordered
        update_data["total_duration"] = sum(s.get("duration", 0) for s in ordered)
        update_data["total_price"] = sum(s.get("price", 0) for s in ordered)

    if data.operator_id is not None:
        if data.operator_id:
            operator = await db.operators.find_one({"id": data.operator_id, "user_id": current_user["id"]}, {"_id": 0})
            if operator:
                update_data["operator_id"] = data.operator_id
                update_data["operator_name"] = operator["name"]
                update_data["operator_color"] = operator.get("color", "#C58970")
        else:
            update_data["operator_id"] = None
            update_data["operator_name"] = None
            update_data["operator_color"] = None

    if data.date:
        update_data["date"] = data.date
    if data.time:
        update_data["time"] = data.time
    if data.status:
        update_data["status"] = data.status
        if data.status == "completed" and appointment.get("status") != "completed":
            client_id = appointment.get("client_id", "")
            if client_id and client_id not in ("", "generic"):
                await db.clients.update_one({"id": client_id}, {"$inc": {"total_visits": 1}})
    if data.notes is not None:
        update_data["notes"] = data.notes

    if "time" in update_data or "total_duration" in update_data:
        time = update_data.get("time", appointment["time"])
        duration = update_data.get("total_duration", appointment["total_duration"])
        update_data["end_time"] = calculate_end_time(time, duration)

    if update_data:
        await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    return await db.appointments.find_one({"id": appointment_id}, {"_id": 0, "user_id": 0})


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.appointments.delete_one({"id": appointment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    return {"message": "Appuntamento eliminato"}


# ============== CHECKOUT ==============

@router.post("/appointments/{appointment_id}/checkout")
async def checkout_appointment(appointment_id: str, data: CheckoutData, current_user: dict = Depends(get_current_user)):
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id, "user_id": current_user["id"],
        "appointment_id": appointment_id, "client_id": appointment["client_id"],
        "client_name": appointment["client_name"], "services": appointment["services"],
        "original_amount": appointment["total_price"],
        "discount_type": data.discount_type, "discount_value": data.discount_value,
        "total_paid": data.total_paid, "payment_method": data.payment_method,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    card = None
    prepaid_deduction = None
    if data.payment_method == "prepaid" and not data.card_id:
        raise HTTPException(status_code=400, detail="Carta prepagata obbligatoria per il pagamento prepagato")
    if data.payment_method == "prepaid" and data.card_id:
        card = await db.cards.find_one({"id": data.card_id, "user_id": current_user["id"], "active": True})
        if not card:
            raise HTTPException(status_code=400, detail="Carta prepagata non trovata o non attiva")
        payment_doc["card_id"] = card["id"]
        payment_doc["card_name"] = card["name"]
        if card.get("card_type") == "subscription":
            # Abbonamento: costo sempre €0, si scala solo il contatore servizi
            prepaid_deduction = 0
        else:
            # Card prepagata: scala il prezzo dell'appuntamento
            prepaid_deduction = appointment["total_price"]
            if data.discount_type == "percent" and data.discount_value:
                prepaid_deduction = round(prepaid_deduction * (1 - data.discount_value / 100), 2)
            elif data.discount_type == "fixed" and data.discount_value:
                prepaid_deduction = max(0, round(prepaid_deduction - data.discount_value, 2))

    if data.payment_method == "prepaid" and data.card_id and not card:
        payment_doc["card_id"] = data.card_id

    await db.payments.insert_one(payment_doc)

    # Vendita card in cassa: registra il pagamento separato per il prezzo della card
    if data.sell_card_on_checkout and card and data.payment_method == "prepaid":
        card_sale_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "appointment_id": appointment_id,
            "client_id": appointment["client_id"],
            "client_name": appointment["client_name"],
            "services": [],
            "original_amount": card.get("total_value", 0),
            "discount_type": "none",
            "discount_value": 0,
            "total_paid": card.get("total_value", 0),
            "payment_method": data.sell_card_payment_method,
            "card_id": card["id"],
            "card_name": card["name"],
            "card_sale": True,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payments.insert_one(card_sale_doc)

    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": "completed", "paid": True, "payment_id": payment_id,
                  "payment_method": data.payment_method, "amount_paid": data.total_paid}}
    )

    # Se il pagamento e "sospeso", crea un record di debito
    if data.payment_method == "sospeso" and data.total_paid > 0:
        sospeso_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "client_id": appointment["client_id"],
            "client_name": appointment["client_name"],
            "appointment_id": appointment_id,
            "amount": data.total_paid,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "services": [s["name"] for s in appointment.get("services", [])],
            "settled": False,
            "settled_at": None,
            "settled_method": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sospesi.insert_one(sospeso_doc)

    # Incrementa total_visits solo se l'appuntamento non era già completato (evita doppio incremento)
    if appointment.get("client_id") and appointment["client_id"] not in ("", "generic") \
            and appointment.get("status") != "completed":
        await db.clients.update_one(
            {"id": appointment["client_id"], "user_id": current_user["id"]},
            {"$inc": {"total_visits": 1}}
        )

    last_service_warning = False
    if card and prepaid_deduction is not None:
        num_services_used = len(appointment.get("services", [])) or 1
        new_used = card.get("used_services", 0) + num_services_used
        total_svc = card.get("total_services")
        is_subscription = card.get("card_type") == "subscription"
        # Controlla abbonamento esaurito prima di procedere
        if is_subscription and total_svc and card.get("used_services", 0) >= total_svc:
            raise HTTPException(status_code=400, detail="Abbonamento esaurito")
        transaction = {
            "date": datetime.now(timezone.utc).isoformat(),
            "description": f"Servizi: {', '.join([s['name'] for s in appointment['services']])}",
            "amount": prepaid_deduction, "appointment_id": appointment_id
        }
        if is_subscription:
            # Abbonamento: non tocca il valore monetario, scala solo i servizi usati
            card_update_result = await db.cards.update_one(
                {"id": card["id"], "active": True},
                {"$inc": {"used_services": num_services_used}, "$push": {"transactions": transaction}}
            )
        else:
            card_update_result = await db.cards.update_one(
                {"id": card["id"], "remaining_value": {"$gte": prepaid_deduction}},
                {"$inc": {"remaining_value": -prepaid_deduction, "used_services": num_services_used},
                 "$push": {"transactions": transaction}}
            )
        if card_update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Credito insufficiente o carta modificata da un'altra operazione")
        new_remaining = round(card["remaining_value"] - (0 if is_subscription else prepaid_deduction), 2)
        # Disattiva la card se esaurita
        if is_subscription:
            if total_svc and new_used >= total_svc:
                await db.cards.update_one({"id": card["id"]}, {"$set": {"active": False}})
        else:
            if new_remaining <= 0 or (total_svc and new_used >= total_svc):
                await db.cards.update_one({"id": card["id"]}, {"$set": {"active": False}})
        # Segnala quando rimane l'ultimo servizio nell'abbonamento
        if is_subscription and total_svc:
            services_left = total_svc - new_used
            last_service_warning = services_left == 1

    # Legge il saldo PRIMA di qualsiasi modifica per calcoli corretti
    loyalty_before = await get_or_create_loyalty(appointment["client_id"], current_user["id"])
    points_before = loyalty_before["points"]

    if data.loyalty_points_used > 0:
        await db.loyalty.update_one(
            {"client_id": appointment["client_id"], "user_id": current_user["id"]},
            {"$inc": {"points": -data.loyalty_points_used}}
        )
    points_earned = 0

    # Punti fedeltà: escludi se usato card, promo, o servizi abbonamento
    has_card = bool(data.card_id)
    has_promo = bool(data.promo_id)
    # Controlla se tutti i servizi sono abbonamenti
    all_abbonamento = False
    if appointment.get("service_ids"):
        svcs = await db.services.find(
            {"id": {"$in": appointment["service_ids"]}, "user_id": current_user["id"]},
            {"_id": 0, "category": 1}
        ).to_list(50)
        all_abbonamento = all(s.get("category") == "abbonamento" for s in svcs) if svcs else False

    if not has_card and not has_promo and not all_abbonamento and data.total_paid > 0:
        points_earned = await award_loyalty_points(
            appointment["client_id"], current_user["id"], data.total_paid, appointment_id
        )
    points_after = points_before + points_earned

    if data.promo_id:
        promo = await db.promotions.find_one({"id": data.promo_id, "user_id": current_user["id"]}, {"_id": 0})
        if promo:
            await db.promo_usage.insert_one({
                "id": str(uuid.uuid4()), "promo_id": data.promo_id, "user_id": current_user["id"],
                "client_id": appointment.get("client_id", ""), "client_name": appointment.get("client_name", ""),
                "appointment_id": appointment_id,
                "free_service": data.promo_free_service or promo.get("free_service_name", ""),
                "used_at": datetime.now(timezone.utc).isoformat()
            })

    threshold_reached = None
    if points_before < 50 and points_after >= 50:
        threshold_reached = 50
    elif points_before < 30 and points_after >= 30:
        threshold_reached = 30
    elif points_before < 20 and points_after >= 20:
        threshold_reached = 20
    elif points_before < 10 and points_after >= 10:
        threshold_reached = 10
    elif points_before < 5 and points_after >= 5:
        threshold_reached = 5

    # Recupera il telefono del cliente (non è sempre salvato sull'appuntamento)
    client_phone = appointment.get("client_phone", "")
    if not client_phone and appointment.get("client_id"):
        client_doc = await db.clients.find_one(
            {"id": appointment["client_id"], "user_id": current_user["id"]},
            {"_id": 0, "phone": 1}
        )
        if client_doc:
            client_phone = client_doc.get("phone", "")

    # Calcola il residuo della card dopo la deduzione
    card_info = None
    if card and prepaid_deduction is not None:
        new_remaining = round(card["remaining_value"] - (0 if card.get("card_type") == "subscription" else prepaid_deduction), 2)
        new_used_services = card.get("used_services", 0) + (len(appointment.get("services", [])) or 1)
        total_svc = card.get("total_services")
        services_left = (total_svc - new_used_services) if total_svc else None
        card_info = {
            "card_name": card["name"],
            "card_type": card.get("card_type", "prepaid"),
            "card_remaining_value": max(0, new_remaining),
            "card_used_services": new_used_services,
            "card_total_services": total_svc,
            "last_service_warning": last_service_warning,
            "services_left": services_left,
        }

    return {
        "success": True, "payment_id": payment_id, "message": "Pagamento registrato con successo",
        "loyalty_points_earned": points_earned, "loyalty_total_points": points_after,
        "loyalty_threshold_reached": threshold_reached,
        "client_phone": client_phone,
        "client_name": appointment.get("client_name", ""),
        **(card_info or {})
    }


# ============== RECURRING ==============

@router.post("/appointments/recurring")
async def create_recurring_appointments(data: RecurringAppointmentCreate, current_user: dict = Depends(get_current_user)):
    original = await db.appointments.find_one(
        {"id": data.appointment_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not original:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    if data.repeat_months == 0 and data.repeat_weeks == 0:
        raise HTTPException(status_code=400, detail="Specificare repeat_months o repeat_weeks maggiore di 0")

    created_appointments = []
    original_date = datetime.strptime(original["date"], "%Y-%m-%d")

    for i in range(1, data.repeat_count + 1):
        if data.repeat_months > 0:
            new_month = original_date.month + (data.repeat_months * i)
            new_year = original_date.year + (new_month - 1) // 12
            new_month = ((new_month - 1) % 12) + 1
            try:
                new_date = original_date.replace(year=new_year, month=new_month)
            except ValueError:
                import calendar
                last_day = calendar.monthrange(new_year, new_month)[1]
                new_date = original_date.replace(year=new_year, month=new_month, day=min(original_date.day, last_day))
        else:
            new_date = original_date + timedelta(weeks=data.repeat_weeks * i)

        appointment_id = str(uuid.uuid4())
        appointment_doc = {
            "id": appointment_id, "user_id": current_user["id"],
            "client_id": original["client_id"], "client_name": original["client_name"],
            "client_phone": original.get("client_phone", ""),
            "service_ids": original["service_ids"], "services": original["services"],
            "operator_id": original.get("operator_id"), "operator_name": original.get("operator_name"),
            "operator_color": original.get("operator_color"),
            "date": new_date.strftime("%Y-%m-%d"), "time": original["time"],
            "end_time": original["end_time"], "total_duration": original["total_duration"],
            "total_price": original["total_price"], "status": "scheduled",
            "notes": original.get("notes", ""), "sms_sent": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.appointments.insert_one(appointment_doc)
        created_appointments.append({"id": appointment_id, "date": appointment_doc["date"], "time": appointment_doc["time"]})

    return {"created": len(created_appointments), "appointments": created_appointments}



# ============== SOSPESI (SUSPENDED PAYMENTS) ==============

@router.get("/sospesi")
async def get_all_sospesi(current_user: dict = Depends(get_current_user)):
    """Restituisce tutti i sospesi non saldati dell'utente (tutte le clienti)."""
    sospesi = await db.sospesi.find(
        {"user_id": current_user["id"], "settled": False},
        {"_id": 0}
    ).sort("date", -1).to_list(500)
    total = sum(s.get("amount", 0) for s in sospesi)
    return {"sospesi": sospesi, "total": total}


@router.get("/sospesi/client/{client_id}")
async def get_client_sospesi(client_id: str, current_user: dict = Depends(get_current_user)):
    """Restituisce tutti i sospesi non saldati di un cliente."""
    sospesi = await db.sospesi.find(
        {"client_id": client_id, "user_id": current_user["id"], "settled": False},
        {"_id": 0}
    ).to_list(100)
    total = sum(s.get("amount", 0) for s in sospesi)
    return {"sospesi": sospesi, "total": total}


class _SettleData(BaseModel):
    payment_method: str = "cash"


@router.post("/sospesi/{sospeso_id}/settle")
async def settle_sospeso(sospeso_id: str, data: _SettleData = _SettleData(), current_user: dict = Depends(get_current_user)):
    """Salda un sospeso (metodo di pagamento nel body JSON, default: cash)."""
    return await _settle_sospeso_impl(sospeso_id, data.payment_method, current_user)


@router.post("/sospesi/{sospeso_id}/settle/{method}")
async def settle_sospeso_with_method(sospeso_id: str, method: str, current_user: dict = Depends(get_current_user)):
    """Salda un sospeso con metodo specificato (cash/pos)."""
    return await _settle_sospeso_impl(sospeso_id, method, current_user)


async def _settle_sospeso_impl(sospeso_id: str, method: str, current_user: dict):
    sospeso = await db.sospesi.find_one(
        {"id": sospeso_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not sospeso:
        raise HTTPException(status_code=404, detail="Sospeso non trovato")
    if sospeso.get("settled"):
        raise HTTPException(status_code=400, detail="Sospeso gia saldato")

    await db.sospesi.update_one(
        {"id": sospeso_id},
        {"$set": {
            "settled": True,
            "settled_at": datetime.now(timezone.utc).isoformat(),
            "settled_method": method
        }}
    )
    return {"success": True, "message": "Sospeso saldato con successo"}


# ── Repair: patch category on old appointments ────────────────────────────────
logger_repair = logging.getLogger("repair")


@router.post("/appointments/repair-categories")
async def repair_appointment_categories(current_user: dict = Depends(get_current_user)):
    """Fill empty categories on master services AND embedded appointment services."""
    # Step 1: Repair master services (only empty categories)
    master_services = await db.services.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(1000)
    svc_repaired = 0
    for svc in master_services:
        if not svc.get("category"):
            inferred = _infer_category_from_name(svc.get("name", ""))
            await db.services.update_one({"id": svc["id"]}, {"$set": {"category": inferred}})
            svc["category"] = inferred
            svc_repaired += 1

    by_id = {s["id"]: s.get("category", "") for s in master_services}

    # Step 2: Fill empty categories on appointment embedded services
    appointments = await db.appointments.find(
        {"user_id": current_user["id"]}, {"_id": 0, "id": 1, "services": 1}
    ).to_list(10000)

    patched = 0
    for apt in appointments:
        needs_update = False
        for svc in (apt.get("services") or []):
            if not svc.get("category"):
                svc["category"] = by_id.get(svc.get("id", ""), "") or _infer_category_from_name(svc.get("name", ""))
                needs_update = True
        if needs_update:
            await db.appointments.update_one(
                {"id": apt["id"]},
                {"$set": {"services": apt["services"]}}
            )
            patched += 1

    return {"success": True, "services_repaired": svc_repaired, "appointments_patched": patched, "total_appointments": len(appointments)}
