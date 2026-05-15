from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date as ddate
from urllib.parse import quote
import uuid
import re
import logging
import asyncio

from database import db
from auth import get_current_user
from models import ClientCreate, ClientResponse, ClientUpdate, ClientBulkImport
from utils import normalize_phone_wa

logger = logging.getLogger(__name__)
router = APIRouter()


def _normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('0039'):
        digits = digits[4:]
    elif digits.startswith('39') and len(digits) > 10:
        digits = digits[2:]
    if digits.startswith('0') and len(digits) > 9:
        digits = digits[1:]
    return digits


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
    # Carica tutti i clienti esistenti per normalizzare i duplicati in modo efficiente
    existing_clients = await db.clients.find(
        {"user_id": current_user["id"]}, {"_id": 0, "name": 1, "phone": 1}
    ).to_list(10000)
    existing_names = {c["name"].lower() for c in existing_clients}
    existing_phones_norm = {_normalize_phone(c.get("phone", "")) for c in existing_clients if c.get("phone")}

    for client_data in data.clients:
        name = client_data.get("name", "").strip()
        if not name:
            skipped += 1
            continue
        incoming_phone = client_data.get("phone") or ""
        incoming_phone_norm = _normalize_phone(incoming_phone)
        # Salta se esiste già per nome (case-insensitive) o per telefono normalizzato
        if name.lower() in existing_names:
            skipped += 1
            continue
        if incoming_phone_norm and incoming_phone_norm in existing_phones_norm:
            skipped += 1
            continue
        client_doc = {
            "id": str(uuid.uuid4()), "user_id": current_user["id"],
            "name": name, "phone": incoming_phone,
            "email": client_data.get("email") or "", "hair_notes": client_data.get("hair_notes") or client_data.get("notes") or "",
            "send_sms_reminders": client_data.get("send_sms_reminders", client_data.get("sms_reminder", True)),
            "total_visits": 0, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.clients.insert_one(client_doc)
        existing_names.add(name.lower())
        if incoming_phone_norm:
            existing_phones_norm.add(incoming_phone_norm)
        imported += 1
    logger.info(f"Importazione clienti: {imported} importati, {skipped} saltati per utente {current_user['id']}")
    return {"imported": imported, "skipped": skipped, "total": imported + skipped}


@router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id, "user_id": current_user["id"],
        "name": data.name, "phone": data.phone or "",
        "email": data.email or "", "hair_notes": data.hair_notes or "",
        "send_sms_reminders": data.send_sms_reminders if data.send_sms_reminders is not None else True,
        "birthday": data.birthday or None,
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


@router.get("/clients/dormant")
async def get_dormant_clients(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Clienti che non vengono da almeno `days` giorni, con storico servizi e suggerimenti."""
    uid = current_user["id"]
    cutoff = (ddate.today() - timedelta(days=days)).isoformat()
    today_str = ddate.today().isoformat()

    all_clients, all_appointments, services_catalog = await asyncio.gather(
        db.clients.find({"user_id": uid}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "hair_notes": 1}).to_list(10000),
        db.appointments.find(
            {"user_id": uid, "status": {"$ne": "cancelled"}},
            {"_id": 0, "client_id": 1, "client_name": 1, "date": 1, "services": 1, "status": 1}
        ).to_list(200000),
        db.services.find({"user_id": uid}, {"_id": 0, "name": 1, "category": 1}).to_list(500),
    )

    all_service_names = [s["name"] for s in services_catalog]

    # Mappa nome normalizzato → client_id reale (per riconciliare orfani)
    client_name_to_id = {c["name"].strip().lower(): c["id"] for c in all_clients}
    real_client_ids = {c["id"] for c in all_clients}

    # Conteggio popolarità globale dei servizi
    service_popularity: dict = {}
    client_data: dict = {}
    for apt in all_appointments:
        cid = apt.get("client_id", "")
        if not cid or cid == "generic":
            continue
        # Se il client_id è orfano (non esiste più come documento), prova a ricondurlo per nome
        if cid not in real_client_ids:
            apt_name = (apt.get("client_name") or "").strip().lower()
            cid = client_name_to_id.get(apt_name, cid)
        d = apt.get("date", "")
        if cid not in client_data:
            client_data[cid] = {"last_date": "0000-00-00", "service_counts": {}}
        if d > client_data[cid]["last_date"]:
            client_data[cid]["last_date"] = d
        if apt.get("status") == "completed":
            for svc in apt.get("services", []):
                name = svc.get("name", "")
                if name:
                    client_data[cid]["service_counts"][name] = client_data[cid]["service_counts"].get(name, 0) + 1
                    service_popularity[name] = service_popularity.get(name, 0) + 1

    dormant = []
    for client in all_clients:
        cid = client["id"]
        cd = client_data.get(cid, {})
        last_date = cd.get("last_date", "0000-00-00")

        if last_date == "0000-00-00":
            days_absent = None
            last_visit = None
        elif last_date >= cutoff:
            continue
        else:
            ld = ddate.fromisoformat(last_date)
            days_absent = (ddate.today() - ld).days
            last_visit = last_date

        svc_counts = cd.get("service_counts", {})
        top_services = sorted(svc_counts.items(), key=lambda x: -x[1])[:4]
        never_done = sorted(
            [s for s in all_service_names if s not in svc_counts],
            key=lambda x: -service_popularity.get(x, 0)
        )[:4]

        dormant.append({
            "id": cid,
            "name": client["name"],
            "phone": client.get("phone") or "",
            "hair_notes": client.get("hair_notes") or "",
            "days_absent": days_absent,
            "last_visit": last_visit,
            "top_services": [{"name": s[0], "count": s[1]} for s in top_services],
            "never_done": never_done,
            "total_visits": sum(svc_counts.values()),
        })

    dormant.sort(key=lambda x: -(x["days_absent"] or 99999))
    return dormant


@router.get("/clients/integrity-check")
async def integrity_check(current_user: dict = Depends(get_current_user)):
    """Trova appuntamenti orfani (client_id senza documento cliente) e clienti duplicate."""
    uid = current_user["id"]

    # Tutti i client_id usati negli appuntamenti
    apt_client_ids = await db.appointments.distinct("client_id", {"user_id": uid})
    apt_client_ids = [cid for cid in apt_client_ids if cid and cid not in ("generic", "")]

    # Client_id che esistono davvero come documenti
    existing = await db.clients.find(
        {"user_id": uid, "id": {"$in": apt_client_ids}}, {"_id": 0, "id": 1}
    ).to_list(2000)
    existing_ids = {c["id"] for c in existing}
    orphan_ids = [cid for cid in apt_client_ids if cid not in existing_ids]

    # Per ogni orfano: info sull'appuntamento più recente + eventuale cliente con stesso nome
    orphans = []
    for oid in orphan_ids:
        last_apt = await db.appointments.find_one(
            {"client_id": oid, "user_id": uid},
            {"_id": 0, "client_name": 1, "date": 1},
            sort=[("date", -1)]
        )
        if not last_apt:
            continue
        apt_count = await db.appointments.count_documents({"client_id": oid, "user_id": uid})
        name = last_apt.get("client_name", "").strip()
        candidate = None
        if name:
            found = await db.clients.find_one(
                {"user_id": uid, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
                {"_id": 0, "id": 1, "name": 1, "phone": 1}
            )
            if found:
                candidate = found
        orphans.append({
            "orphan_client_id": oid,
            "client_name": name,
            "appointments_count": apt_count,
            "last_appointment_date": last_apt.get("date", ""),
            "suggested_client": candidate,
        })

    # Clienti duplicate (stesso nome normalizzato, id diversi)
    all_clients = await db.clients.find(
        {"user_id": uid}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "created_at": 1}
    ).to_list(5000)
    name_map: dict = {}
    for c in all_clients:
        key = c["name"].strip().lower()
        name_map.setdefault(key, []).append(c)
    duplicates = [
        {"name": v[0]["name"], "clients": v}
        for v in name_map.values() if len(v) > 1
    ]

    return {
        "orphan_appointments": orphans,
        "duplicate_clients": duplicates,
        "total_issues": len(orphans) + len(duplicates),
    }


@router.post("/clients/{source_id}/merge-into/{target_id}")
async def merge_clients(source_id: str, target_id: str, current_user: dict = Depends(get_current_user)):
    """Sposta tutti gli appuntamenti e pagamenti da source a target, poi elimina source."""
    uid = current_user["id"]
    source = await db.clients.find_one({"id": source_id, "user_id": uid}, {"_id": 0})
    target = await db.clients.find_one({"id": target_id, "user_id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Cliente destinazione non trovato")

    apt_res = await db.appointments.update_many(
        {"client_id": source_id, "user_id": uid},
        {"$set": {"client_id": target_id, "client_name": target["name"], "client_phone": target.get("phone", "")}}
    )
    pay_res = await db.payments.update_many(
        {"client_id": source_id, "user_id": uid},
        {"$set": {"client_id": target_id}}
    )
    await db.reminders_sent.update_many(
        {"client_id": source_id, "user_id": uid},
        {"$set": {"client_id": target_id}}
    )
    if source:
        await db.clients.delete_one({"id": source_id, "user_id": uid})

    logger.info(f"Merge {source_id} → {target_id}: {apt_res.modified_count} apt, {pay_res.modified_count} pay")
    return {
        "success": True,
        "appointments_moved": apt_res.modified_count,
        "payments_moved": pay_res.modified_count,
    }


@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return ClientResponse(**_normalize_client(client))


@router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None or k == "birthday"}
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
    """Restituisce lo storico completo di un cliente: appuntamenti sincronizzati con i pagamenti."""
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")

    # Pagamenti (source of truth per importi e metodi)
    payments_raw = await db.payments.find(
        {"client_id": client_id, "user_id": current_user["id"]},
        {"_id": 0, "user_id": 0}
    ).sort("date", -1).to_list(100)

    # Mappa appointment_id → payment per cross-reference
    payment_by_apt: dict = {}
    for pay in payments_raw:
        apt_id = pay.get("appointment_id")
        if apt_id:
            payment_by_apt[apt_id] = pay

    payments = [
        {
            "id": pay.get("id", ""),
            "date": pay.get("date", ""),
            "total_paid": pay.get("total_paid", 0),
            "payment_method": pay.get("payment_method", ""),
            "services": pay.get("services", []),
        }
        for pay in payments_raw
    ]

    total_spent = sum(p.get("total_paid", 0) for p in payments_raw)

    # Appuntamenti (ultimo anno, ordinati per data decrescente)
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
    appointments_raw = await db.appointments.find(
        {"client_id": client_id, "user_id": current_user["id"], "date": {"$gte": one_year_ago}},
        {"_id": 0, "user_id": 0}
    ).sort("date", -1).to_list(50)

    appointments = []
    for apt in appointments_raw:
        apt_id = apt.get("id", "")
        linked_pay = payment_by_apt.get(apt_id)
        appointments.append({
            "id": apt_id,
            "date": apt.get("date", ""),
            "time": apt.get("time", ""),
            "services": apt.get("services", []),
            "operator_name": apt.get("operator_name", ""),
            "status": apt.get("status", ""),
            "paid": apt.get("paid", False),
            # Usa i dati reali del pagamento se disponibili
            "amount_paid": linked_pay.get("total_paid", apt.get("amount_paid", 0)) if linked_pay else apt.get("amount_paid", 0),
            "payment_method": linked_pay.get("payment_method", apt.get("payment_method", "")) if linked_pay else apt.get("payment_method", ""),
            "payment_id": linked_pay.get("id", "") if linked_pay else "",
        })

    # Ultima visita
    last_completed = await db.appointments.find_one(
        {"client_id": client_id, "user_id": current_user["id"], "status": "completed"},
        {"_id": 0, "date": 1}, sort=[("date", -1)]
    )
    last_visit = last_completed.get("date", "") if last_completed else ""

    # Premi promo attivi
    active_rewards_raw = await db.promotions.find(
        {"user_id": current_user["id"]}, {"_id": 0, "id": 1, "name": 1, "free_service_name": 1}
    ).to_list(20)
    promo_usage = await db.promo_usage.find(
        {"client_id": client_id, "user_id": current_user["id"]}, {"_id": 0, "promo_id": 1, "free_service": 1}
    ).to_list(20)
    used_promo_ids = {u["promo_id"] for u in promo_usage}
    active_rewards = [
        {"reward_name": p.get("free_service_name") or p.get("name")}
        for p in active_rewards_raw if p["id"] in used_promo_ids
    ]

    return {
        "client": {"id": client.get("id"), "name": client.get("name"), "phone": client.get("phone", ""), "hair_notes": client.get("hair_notes", "")},
        "total_visits": client.get("total_visits", 0),
        "total_spent": total_spent,
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
    clean = normalize_phone_wa(phone)
    greeting = quote(f"Ciao {client.get('name', '')}!")
    return {"url": f"https://wa.me/{clean}?text={greeting}"}


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    logger.info(f"Cliente {client_id} eliminato da utente {current_user['id']}")
    return {"message": "Cliente eliminato"}


