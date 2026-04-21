from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import PrepaidCardCreate, PrepaidCardResponse, PrepaidCardUpdate, CardTransaction

router = APIRouter()


# ============== PREPAID CARDS ==============

@router.post("/cards", response_model=PrepaidCardResponse)
async def create_prepaid_card(data: PrepaidCardCreate, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": data.client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    card_id = str(uuid.uuid4())
    card_doc = {
        "id": card_id, "user_id": current_user["id"],
        "client_id": data.client_id, "client_name": client["name"],
        "card_type": data.card_type, "name": data.name,
        "total_value": data.total_value, "remaining_value": data.total_value,
        "total_services": data.total_services, "used_services": 0,
        "valid_until": data.valid_until, "notes": data.notes or "",
        "active": True, "transactions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cards.insert_one(card_doc)
    return PrepaidCardResponse(**{k: v for k, v in card_doc.items() if k != "user_id"})


@router.get("/cards", response_model=List[PrepaidCardResponse])
async def get_cards(client_id: Optional[str] = None, active_only: bool = True, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if client_id:
        query["client_id"] = client_id
    if active_only:
        query["active"] = True
    return await db.cards.find(query, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/cards/{card_id}", response_model=PrepaidCardResponse)
async def get_card(card_id: str, current_user: dict = Depends(get_current_user)):
    card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card non trovata")
    return card


@router.put("/cards/{card_id}", response_model=PrepaidCardResponse)
async def update_card(card_id: str, data: PrepaidCardUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.cards.update_one({"id": card_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card non trovata")
    return await db.cards.find_one({"id": card_id}, {"_id": 0, "user_id": 0})


@router.delete("/cards/{card_id}")
async def delete_card(card_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.cards.delete_one({"id": card_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Card non trovata")
    return {"message": "Card eliminata"}


@router.post("/cards/{card_id}/use")
async def use_card(card_id: str, data: CardTransaction, current_user: dict = Depends(get_current_user)):
    card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"]}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card non trovata")
    if not card["active"]:
        raise HTTPException(status_code=400, detail="Card non attiva")
    if card.get("valid_until"):
        if datetime.strptime(card["valid_until"], "%Y-%m-%d").date() < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail="Card scaduta")
    if card["remaining_value"] < data.amount:
        raise HTTPException(status_code=400, detail=f"Credito insufficiente. Disponibile: €{card['remaining_value']:.2f}")
    transaction = {
        "id": str(uuid.uuid4()), "amount": data.amount,
        "appointment_id": data.appointment_id,
        "description": data.description or f"Utilizzo card - €{data.amount:.2f}",
        "date": datetime.now(timezone.utc).isoformat()
    }
    # Aggiornamento atomico con $inc per evitare race condition
    result = await db.cards.find_one_and_update(
        {"id": card_id, "user_id": current_user["id"], "active": True, "remaining_value": {"$gte": data.amount}},
        {"$inc": {"remaining_value": -data.amount, "used_services": 1},
         "$push": {"transactions": transaction}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=409, detail="Transazione non completata: credito insufficiente o card non più attiva")
    new_remaining = result["remaining_value"]
    new_used_services = result["used_services"]
    is_exhausted = new_remaining <= 0
    if result.get("total_services"):
        is_exhausted = is_exhausted or new_used_services >= result["total_services"]
    if is_exhausted:
        await db.cards.update_one({"id": card_id}, {"$set": {"active": False}})
    return {"success": True, "transaction": transaction, "remaining_value": new_remaining,
            "used_services": new_used_services, "card_active": not is_exhausted}


@router.post("/cards/{card_id}/recharge")
async def recharge_card(card_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    transaction = {
        "id": str(uuid.uuid4()), "amount": -amount, "appointment_id": None,
        "description": f"Ricarica - €{amount:.2f}", "date": datetime.now(timezone.utc).isoformat()
    }
    # Aggiornamento atomico con $inc per evitare race condition
    result = await db.cards.find_one_and_update(
        {"id": card_id, "user_id": current_user["id"]},
        {"$inc": {"remaining_value": amount, "total_value": amount},
         "$set": {"active": True},
         "$push": {"transactions": transaction}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Card non trovata")
    return {"success": True, "new_remaining": result["remaining_value"], "new_total": result["total_value"]}


# ============== SELL CARD (from template) ==============

class SellCardRequest(BaseModel):
    template_id: str
    client_id: str
    amount_paid: float
    payment_method: str = "cash"


@router.post("/cards/sell")
async def sell_card_from_template(data: SellCardRequest, current_user: dict = Depends(get_current_user)):
    """Sell a card/subscription to a client: create card + record payment (incasso)."""
    # Find template
    template = await db.card_templates.find_one({"id": data.template_id, "user_id": current_user["id"]}, {"_id": 0})
    if not template:
        template = await db.card_templates.find_one({"id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")

    # Find client
    client = await db.clients.find_one({"id": data.client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")

    # Calculate valid_until
    valid_until = None
    if template.get("duration_months"):
        from dateutil.relativedelta import relativedelta
        valid_until = (datetime.now(timezone.utc) + relativedelta(months=template["duration_months"])).strftime("%Y-%m-%d")

    # Create the card
    card_id = str(uuid.uuid4())
    card_doc = {
        "id": card_id, "user_id": current_user["id"],
        "client_id": data.client_id, "client_name": client["name"],
        "card_type": template.get("card_type", "prepaid"),
        "name": template["name"],
        "total_value": template["total_value"],
        "remaining_value": template["total_value"],
        "total_services": template.get("total_services"),
        "used_services": 0,
        "valid_until": valid_until,
        "notes": template.get("notes", ""),
        "active": True, "transactions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cards.insert_one(card_doc)

    # Record payment (incasso)
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id, "user_id": current_user["id"],
        "appointment_id": None,
        "client_id": data.client_id, "client_name": client["name"],
        "services": [{"name": f"Vendita: {template['name']}", "price": data.amount_paid, "duration": 0, "category": "abbonamento"}],
        "original_amount": template["total_value"],
        "discount_type": None, "discount_value": 0,
        "total_paid": data.amount_paid,
        "payment_method": data.payment_method,
        "card_sale_id": card_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)

    return {
        "success": True,
        "card_id": card_id,
        "card_name": template["name"],
        "total_value": template["total_value"],
        "amount_paid": data.amount_paid,
        "valid_until": valid_until,
        "payment_id": payment_id,
        "client_name": client["name"]
    }



# ============== CARD TEMPLATES ==============

from pydantic import BaseModel

class CardTemplateCreate(BaseModel):
    name: str
    card_type: str = "prepaid"
    total_value: float
    total_services: Optional[int] = None
    duration_months: Optional[int] = None
    notes: Optional[str] = ""

class CardTemplateUpdate(BaseModel):
    name: Optional[str] = None
    card_type: Optional[str] = None
    total_value: Optional[float] = None
    total_services: Optional[int] = None
    duration_months: Optional[int] = None
    notes: Optional[str] = None


@router.get("/card-templates")
async def get_card_templates(current_user: dict = Depends(get_current_user)):
    return await db.card_templates.find(
        {"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(50)


@router.post("/card-templates")
async def create_card_template(data: CardTemplateCreate, current_user: dict = Depends(get_current_user)):
    template = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "name": data.name, "card_type": data.card_type,
        "total_value": data.total_value, "total_services": data.total_services,
        "duration_months": data.duration_months, "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.card_templates.insert_one(template)
    return {k: v for k, v in template.items() if k not in ("_id", "user_id")}


@router.put("/card-templates/{template_id}")
async def update_card_template(template_id: str, data: CardTemplateUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.card_templates.update_one({"id": template_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return await db.card_templates.find_one({"id": template_id}, {"_id": 0, "user_id": 0})


@router.delete("/card-templates/{template_id}")
async def delete_card_template(template_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.card_templates.delete_one({"id": template_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"success": True}


# ============== CARD ALERTS (Expiring & Low Balance) ==============

from datetime import timedelta

@router.get("/cards/alerts/expiring")
async def get_expiring_cards(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get cards expiring within X days"""
    today = datetime.now(timezone.utc).date()
    limit_date = today + timedelta(days=days)
    
    cards = await db.cards.find(
        {"user_id": current_user["id"], "active": True, "valid_until": {"$ne": None}},
        {"_id": 0, "user_id": 0}
    ).to_list(500)
    
    expiring = []
    for card in cards:
        if card.get("valid_until"):
            try:
                exp_date = datetime.strptime(card["valid_until"], "%Y-%m-%d").date()
                if exp_date <= limit_date:
                    days_left = (exp_date - today).days
                    # Get client phone
                    client = await db.clients.find_one({"id": card["client_id"]}, {"_id": 0, "phone": 1, "name": 1})
                    card["days_until_expiry"] = days_left
                    card["is_expired"] = days_left < 0
                    card["client_phone"] = client.get("phone", "") if client else ""
                    expiring.append(card)
            except (ValueError, TypeError):
                pass
    
    # Sort by days until expiry (most urgent first)
    expiring.sort(key=lambda x: x.get("days_until_expiry", 999))
    return expiring


@router.get("/cards/alerts/low-balance")
async def get_low_balance_cards(threshold_percent: int = 20, current_user: dict = Depends(get_current_user)):
    """Get cards with balance below X% of total value, or subscriptions with ≤2 sessions remaining"""
    cards = await db.cards.find(
        {"user_id": current_user["id"], "active": True},
        {"_id": 0, "user_id": 0}
    ).to_list(500)

    low_balance = []
    for card in cards:
        total = card.get("total_value", 0)
        remaining = card.get("remaining_value", 0)
        total_svc = card.get("total_services")
        used_svc = card.get("used_services", 0)
        is_subscription = card.get("card_type") == "subscription"

        # Per abbonamento: alert se rimane 1 sola seduta
        if is_subscription and total_svc:
            remaining_sessions = total_svc - used_svc
            if remaining_sessions == 1:
                client = await db.clients.find_one({"id": card["client_id"]}, {"_id": 0, "phone": 1, "name": 1})
                card["percent_remaining"] = round((remaining / total) * 100, 1) if total > 0 else 0
                card["remaining_sessions"] = remaining_sessions
                card["client_phone"] = client.get("phone", "") if client else ""
                low_balance.append(card)
                continue

        # Per card prepagata: alert se credito sotto soglia %
        if total > 0:
            percent_remaining = (remaining / total) * 100
            if percent_remaining <= threshold_percent and remaining > 0:
                client = await db.clients.find_one({"id": card["client_id"]}, {"_id": 0, "phone": 1, "name": 1})
                card["percent_remaining"] = round(percent_remaining, 1)
                card["client_phone"] = client.get("phone", "") if client else ""
                low_balance.append(card)

    # Sort by percent remaining (lowest first)
    low_balance.sort(key=lambda x: x.get("percent_remaining", 100))
    return low_balance


@router.get("/cards/alerts/all")
async def get_all_card_alerts(days: int = 30, threshold_percent: int = 20, current_user: dict = Depends(get_current_user)):
    """Get all card alerts (expiring + low balance) in one call"""
    expiring = await get_expiring_cards(days, current_user)
    low_balance = await get_low_balance_cards(threshold_percent, current_user)
    
    # Count unique alerts (cards can be both expiring and low balance)
    low_balance_ids = {c["id"] for c in low_balance}
    duplicates = len([c for c in expiring if c["id"] in low_balance_ids])
    
    return {
        "expiring_cards": expiring,
        "low_balance_cards": low_balance,
        "total_alerts": len(expiring) + len(low_balance) - duplicates
    }


@router.post("/cards/alerts/mark-notified/{card_id}")
async def mark_card_notified(card_id: str, notification_type: str = "whatsapp", current_user: dict = Depends(get_current_user)):
    """Mark a card as notified (to avoid sending duplicate notifications)"""
    notification = {
        "type": notification_type,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": current_user["id"]
    }
    
    result = await db.cards.update_one(
        {"id": card_id, "user_id": current_user["id"]},
        {"$push": {"notifications": notification}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card non trovata")
    
    return {"success": True, "notification": notification}

