import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta
from calendar import monthrange
from auth import get_current_user
from database import db
from models import AppointmentCreate, AppointmentResponse, CheckoutData
from utils import calculate_end_time, send_whatsapp, send_automatic_message, resolve_client

router = APIRouter()
logger = logging.getLogger(__name__)


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
async def checkout_appointment(appointment_id: str, data: CheckoutData, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id, "user_id": current_user["id"]}, {"_id": 0})
    if not apt: raise HTTPException(status_code=404, detail="Appuntamento non trovato")

    is_split = bool(data.payment_splits) and len(data.payment_splits) > 1
    if is_split and data.card_id:
        raise HTTPException(status_code=400, detail="Il pagamento diviso non supporta card/abbonamento")

    card_id = data.card_id
    card_result = None
    card_type_used = None

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
                updated_card = await db.cards.find_one_and_update(
                    {"id": card_id, "user_id": current_user["id"], "active": True},
                    {"$inc": {"used_services": 1}, "$push": {"transactions": transaction}},
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
                remaining_services = (total_svc - used) if total_svc else None
                card_result = {
                    "card_id": card_id,
                    "card_active": not is_exhausted,
                    "remaining_value": remaining_val,
                    "remaining_services": remaining_services,
                    "used_services": used,
                }

    # Prezzi/quantità modificati in cassa: sovrascrivono i servizi dell'appuntamento
    if data.custom_services:
        final_services = [
            {"id": s.id, "name": s.name, "price": s.price, "quantity": s.quantity, "duration": s.duration}
            for s in data.custom_services
        ]
        total_price_calc = sum(s["price"] * s["quantity"] for s in final_services)
        total_duration_calc = sum(s["duration"] * s["quantity"] for s in final_services)
        await db.appointments.update_one(
            {"id": appointment_id, "user_id": current_user["id"]},
            {"$set": {"services": final_services, "total_price": total_price_calc, "total_duration": total_duration_calc}}
        )
        apt["services"] = final_services
        service_total = total_price_calc
    else:
        service_total = apt.get("total_price", 0.0)

    # Prodotti rivendita venduti in cassa: prezzo/nome letti dal magazzino (mai dal client)
    retail_lines = []
    retail_total = 0.0
    if data.retail_items:
        product_ids = [ri.product_id for ri in data.retail_items]
        retail_products = await db.inventory.find(
            {"id": {"$in": product_ids}, "user_id": current_user["id"]}, {"_id": 0}
        ).to_list(200)
        prod_map = {p["id"]: p for p in retail_products}
        for ri in data.retail_items:
            prod = prod_map.get(ri.product_id)
            if not prod:
                raise HTTPException(status_code=400, detail="Prodotto rivendita non trovato in magazzino")
            price = prod.get("sale_price") or 0.0
            retail_lines.append({"product_id": prod["id"], "name": prod["name"], "quantity": ri.quantity, "price": price})
            retail_total += price * ri.quantity

    # Verifica server-side: l'incasso dichiarato deve corrispondere al totale servizi meno sconto
    # (evita che un client malevolo/bug dichiari un incasso inferiore al valore reale erogato)
    if card_type_used != "subscription":
        discount_amount = 0.0
        if data.discount_type == "percent" and data.discount_value:
            discount_amount = service_total * (data.discount_value / 100)
        elif data.discount_type == "fixed" and data.discount_value:
            discount_amount = data.discount_value
        expected_total = max(0.0, service_total - discount_amount) + retail_total
        declared_total = sum(s.amount for s in data.payment_splits) if is_split else data.total_paid
        if abs(declared_total - expected_total) > 0.02:
            raise HTTPException(status_code=400, detail="L'importo dichiarato non corrisponde al totale di servizi e prodotti")

    # Subscription checkout: incasso già registrato alla vendita → €0
    final_payment_method = "split" if is_split else data.payment_method

    payments_to_insert = []
    if is_split:
        for split in data.payment_splits:
            split_amount = 0.0 if card_type_used == "subscription" else split.amount
            payments_to_insert.append({
                "id": str(uuid.uuid4()), "user_id": current_user["id"], "appointment_id": appointment_id,
                "client_id": apt["client_id"], "client_name": apt["client_name"],
                "total_paid": split_amount,
                "payment_method": split.method,
                "payment_type": "split_payment",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "services": apt["services"],
                "retail_items": retail_lines,
                "card_id": card_id,
                "discount_type": data.discount_type,
                "discount_value": data.discount_value,
                "note": data.note,
            })
    else:
        # Il servizio può essere gratuito (abbonamento) ma i prodotti rivendita vanno sempre incassati
        total_paid_amount = retail_total if card_type_used == "subscription" else data.total_paid
        # payment_type esplicito per classificazione precisa in ReportIncassi
        if card_type_used == "subscription":
            payment_type = "subscription_checkout"
        elif card_type_used == "prepaid":
            payment_type = "prepaid_checkout"
        else:
            payment_type = data.payment_method
        payments_to_insert.append({
            "id": str(uuid.uuid4()), "user_id": current_user["id"], "appointment_id": appointment_id,
            "client_id": apt["client_id"], "client_name": apt["client_name"],
            "total_paid": total_paid_amount,
            "payment_method": data.payment_method,
            "payment_type": payment_type,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services": apt["services"],
            "retail_items": retail_lines,
            "card_id": card_id,
            "discount_type": data.discount_type,
            "discount_value": data.discount_value,
            "note": data.note,
        })

    await db.payments.insert_many(payments_to_insert)
    await db.appointments.update_one({"id": appointment_id, "user_id": current_user["id"]}, {"$set": {"status": "completed", "paid": True, "payment_method": final_payment_method}})

    # SCARICO MAGAZZINO AUTOMATICO — legge categoria e prodotto collegato dai servizi originali
    # inventory_log: cosa è stato scaricato e cosa no (mostrato in cassa per diagnosi)
    inventory_log = {"deducted": [], "warnings": []}
    try:
        service_list = apt.get("services", [])
        service_ids = list({s.get("id") for s in service_list if s.get("id")})
        if service_ids:
            db_services = await db.services.find(
                {"id": {"$in": service_ids}, "user_id": current_user["id"]}
            ).to_list(100)
            svc_map = {s["id"]: s for s in db_services}
            client_doc = await db.clients.find_one(
                {"id": apt.get("client_id"), "user_id": current_user["id"]}, {"_id": 0}
            ) if apt.get("client_id") else None
            for s in service_list:
                db_svc = svc_map.get(s.get("id"))
                if not db_svc:
                    continue
                try:
                    qty = int(s.get("quantity", 1) or 1)
                except (TypeError, ValueError):
                    qty = 1
                svc_name = db_svc.get("name", "servizio")
                category = (db_svc.get("category") or "").lower()
                if "colore" in category:
                    raw_codes = ((client_doc or {}).get("current_color_code") or "").strip()
                    if not raw_codes:
                        inventory_log["warnings"].append(f"{svc_name}: cliente senza Codice Colore")
                        continue
                    # supporta più colori: separati da virgola, +, /, ; o a capo
                    color_codes = [c.strip() for c in re.split(r"[,;+/\n]+", raw_codes) if c.strip()]
                    for color_code in color_codes:
                        # match nome prodotto case-insensitive + spazi ignorati
                        inv_prod = await db.inventory.find_one({
                            "user_id": current_user["id"],
                            "name": {"$regex": f"^\\s*{re.escape(color_code)}\\s*$", "$options": "i"},
                        })
                        if not inv_prod:
                            inventory_log["warnings"].append(f"{svc_name}: nessun prodotto magazzino chiamato «{color_code}»")
                            continue
                        dec = abs(inv_prod.get("dose_size", 1.0)) * qty
                        await db.inventory.update_one(
                            {"id": inv_prod["id"], "user_id": current_user["id"]},
                            {"$inc": {"total_stock": -dec}}
                        )
                        inventory_log["deducted"].append(f"{inv_prod['name']} −{dec:g}")
                elif db_svc.get("linked_inventory_id"):
                    inv_prod = await db.inventory.find_one({"id": db_svc["linked_inventory_id"], "user_id": current_user["id"]})
                    if not inv_prod:
                        inventory_log["warnings"].append(f"{svc_name}: prodotto collegato non trovato in magazzino")
                        continue
                    # Rivendita = 1 pezzo intero; altri = dose per uso
                    dec = (1 if "rivendita" in category else abs(inv_prod.get("dose_size", 1.0))) * qty
                    await db.inventory.update_one(
                        {"id": inv_prod["id"], "user_id": current_user["id"]},
                        {"$inc": {"total_stock": -dec}}
                    )
                    inventory_log["deducted"].append(f"{inv_prod['name']} −{dec:g}")
                elif category in ("trattamento", "permanente", "rivendita"):
                    inventory_log["warnings"].append(f"{svc_name}: nessun prodotto magazzino collegato al servizio")

        # Prodotti rivendita venduti direttamente in cassa
        for line in retail_lines:
            await db.inventory.update_one(
                {"id": line["product_id"], "user_id": current_user["id"]},
                {"$inc": {"total_stock": -line["quantity"]}}
            )
            inventory_log["deducted"].append(f"{line['name']} −{line['quantity']:g}")
    except Exception as e:
        logger.error(f"Errore scarico magazzino checkout {appointment_id}: {e}")

    phone = apt.get("client_phone")
    if not phone and apt.get("client_id"):
        cl = await db.clients.find_one({"id": apt["client_id"], "user_id": current_user["id"]})
        if cl: phone = cl.get("phone")
    if phone: background_tasks.add_task(_send_checkout_thank_you, phone, apt["client_name"], current_user, payments_to_insert[0]["id"])
    return {"status": "ok", "payment_id": payments_to_insert[0]["id"], "card": card_result, "inventory": inventory_log}

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(date: Optional[str] = None, month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if date:
        query["date"] = date
    elif month:  # formato YYYY-MM
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
