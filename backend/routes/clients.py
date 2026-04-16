from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
import uuid
import logging

from database import db
from auth import get_current_user
from models import ClientCreate, ClientResponse, ClientUpdate, ClientBulkImport

logger = logging.getLogger(__name__)
router = APIRouter()


def _normalize_client(doc: dict) -> dict:
    """Normalizza il campo sms: unifica sms_reminder legacy → send_sms_reminders."""
    if "sms_reminder" in doc and "send_sms_reminders" not in doc:
        doc["send_sms_reminders"] = doc.pop("sms_reminder")
    doc.pop("sms_reminder", None)
    doc.pop("_id", None)
    doc.pop("user_id", None)
    return doc


@router.post("/clients/import")
async def import_clients_bulk(data: ClientBulkImport, current_user: dict = Depends(get_current_user)):
    imported = 0
    skipped = 0
    for client_data in data.clients:
        name = client_data.get("name", "").strip()
        if not name:
            skipped += 1
            continue
        exists = await db.clients.find_one({"user_id": current_user["id"], "name": name})
        if exists:
            skipped += 1
            continue
        client_doc = {
            "id": str(uuid.uuid4()), "user_id": current_user["id"],
            "name": name, "phone": client_data.get("phone") or "",
            "email": client_data.get("email") or "", "notes": client_data.get("notes") or "",
            "send_sms_reminders": client_data.get("send_sms_reminders", client_data.get("sms_reminder", True)),
            "total_visits": 0, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(client_doc)
        imported += 1
    logger.info(f"Importazione clienti: {imported} importati, {skipped} saltati per utente {current_user['id']}")
    return {"imported": imported, "skipped": skipped, "total": imported + skipped}


@router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id, "user_id": current_user["id"],
        "name": data.name, "phone": data.phone or "",
        "email": data.email or "", "notes": data.notes or "",
        "send_sms_reminders": data.send_sms_reminders if data.send_sms_reminders is not None else True,
        "total_visits": 0, "created_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        await db.clients.insert_one(client_doc)
    except Exception as e:
        if "duplicate key" in str(e).lower() or "E11000" in str(e):
            raise HTTPException(status_code=400, detail=f"Esiste già un cliente con il nome '{data.name}'")
        logger.error(f"Errore creazione cliente: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nel salvataggio: {str(e)}")
    return ClientResponse(**_normalize_client(dict(client_doc)))


@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(current_user: dict = Depends(get_current_user)):
    docs = await db.clients.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("name", 1).to_list(1000)
    return [ClientResponse(**_normalize_client(d)) for d in docs]


@router.get("/clients/search/appointments")
async def search_client_appointments(query: str, current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find(
        {"user_id": current_user["id"], "name": {"$regex": query, "$options": "i"}},
        {"_id": 0}
    ).to_list(20)
    if not clients:
        return {"clients": [], "appointments": []}
    client_ids = [c["id"] for c in clients]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    appointments = await db.appointments.find(
        {"user_id": current_user["id"], "client_id": {"$in": client_ids},
         "date": {"$gte": today}, "status": {"$ne": "cancelled"}},
        {"_id": 0, "user_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(50)
    return {
        "clients": [{"id": c["id"], "name": c["name"], "phone": c.get("phone", "")} for c in clients],
        "appointments": appointments
    }


@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return ClientResponse(**_normalize_client(client))


@router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    try:
        result = await db.clients.update_one(
            {"id": client_id, "user_id": current_user["id"]}, {"$set": update_data}
        )
    except Exception as e:
        if "duplicate key" in str(e).lower() or "E11000" in str(e):
            raise HTTPException(status_code=400, detail="Esiste già un cliente con questo nome")
        raise HTTPException(status_code=500, detail=f"Errore aggiornamento: {str(e)}")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return ClientResponse(**_normalize_client(updated))


@router.get("/clients/{client_id}/history")
async def get_client_history(client_id: str, current_user: dict = Depends(get_current_user)):
    """Restituisce lo storico completo di un cliente: appuntamenti, pagamenti, fedeltà."""
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")

    # Appuntamenti (ultimi 3 mesi, ordinati per data decrescente)
    three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")
    appointments_raw = await db.appointments.find(
        {"client_id": client_id, "user_id": current_user["id"], "date": {"$gte": three_months_ago}},
        {"_id": 0, "user_id": 0}
    ).sort("date", -1).to_list(50)
    appointments = []
    for apt in appointments_raw:
        appointments.append({
            "id": apt.get("id", ""),
            "date": apt.get("date", ""),
            "time": apt.get("time", ""),
            "services": apt.get("services", []),
            "operator_name": apt.get("operator_name", ""),
            "status": apt.get("status", ""),
            "paid": apt.get("paid", False),
            "amount_paid": apt.get("amount_paid", 0),
        })

    # Pagamenti
    payments_raw = await db.payments.find(
        {"client_id": client_id, "user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).sort("date", -1).to_list(50)
    payments = []
    for pay in payments_raw:
        payments.append({
            "id": pay.get("id", ""),
            "date": pay.get("date", ""),
            "total_paid": pay.get("total_paid", 0),
            "payment_method": pay.get("payment_method", ""),
            "services": pay.get("services", []),
        })

    total_spent = sum(p.get("total_paid", 0) for p in payments_raw)

    # Fedeltà
    loyalty = await db.loyalty.find_one(
        {"client_id": client_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    loyalty_points = loyalty.get("points", 0) if loyalty else 0
    active_rewards = loyalty.get("active_rewards", []) if loyalty else []

    # Ultima visita
    last_completed = await db.appointments.find_one(
        {"client_id": client_id, "user_id": current_user["id"], "status": "completed"},
        {"_id": 0, "date": 1}, sort=[("date", -1)]
    )
    last_visit = last_completed.get("date", "") if last_completed else ""

    return {
        "client": {"id": client.get("id"), "name": client.get("name"), "phone": client.get("phone", "")},
        "total_visits": client.get("total_visits", 0),
        "total_spent": total_spent,
        "loyalty_points": loyalty_points,
        "active_rewards": active_rewards,
        "last_visit": last_visit,
        "appointments": appointments,
        "payments": payments,
    }


@router.get("/clients/{client_id}/whatsapp")
async def get_client_whatsapp(client_id: str, current_user: dict = Depends(get_current_user)):
    """Genera un link WhatsApp per contattare il cliente."""
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    phone = client.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Il cliente non ha un numero di telefono")
    # Normalizza il numero
    clean = phone.replace(" ", "").replace("-", "").replace("+", "").replace("(", "").replace(")", "")
    if clean.startswith("0039"):
        clean = clean[2:]
    if not clean.startswith("39"):
        clean = "39" + clean
    greeting = quote(f"Ciao {client.get('name', '')}!")
    return {"url": f"https://wa.me/{clean}?text={greeting}"}


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    logger.info(f"Cliente {client_id} eliminato da utente {current_user['id']}")
    return {"message": "Cliente eliminato"}
