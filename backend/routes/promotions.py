from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
from pydantic import BaseModel

from database import db
from auth import get_current_user

router = APIRouter()


class PromoCreate(BaseModel):
    name: str
    description: str
    rule_type: str
    free_service_name: str
    promo_code: Optional[str] = None
    active: bool = True
    show_on_booking: bool = True

class PromoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_type: Optional[str] = None
    free_service_name: Optional[str] = None
    promo_code: Optional[str] = None
    active: Optional[bool] = None
    show_on_booking: Optional[bool] = None


async def seed_default_promotions(user_id: str):
    defaults = [
        {"name": "Speciale Under 30", "description": "Piega o trattamento lucidante GRATIS con qualsiasi servizio colore per le under 30", "rule_type": "under_30", "free_service_name": "Piega o Trattamento Lucidante", "promo_code": "UNDER30"},
        {"name": "Recensione Google", "description": "Lascia una recensione con foto su Google e ricevi un trattamento Olaplex o Maschera Ristrutturante IN OMAGGIO alla prossima visita", "rule_type": "review", "free_service_name": "Maschera Ristrutturante o Olaplex", "promo_code": "REVIEW"},
        {"name": "Porta un'Amica", "description": "Porta un'amica e ricevete entrambe un servizio extra GRATIS (taglio punte o trattamento)", "rule_type": "referral", "free_service_name": "Taglio Punte o Trattamento", "promo_code": "AMICA"},
        {"name": "Prima Visita", "description": "Per i nuovi clienti: consulenza colore personalizzata + trattamento IN OMAGGIO", "rule_type": "first_visit", "free_service_name": "Consulenza Colore + Trattamento", "promo_code": "BENVENUTA"},
        {"name": "Buon Compleanno!", "description": "Nel mese del tuo compleanno ricevi una piega o trattamento IN OMAGGIO con qualsiasi servizio", "rule_type": "birthday", "free_service_name": "Piega o Trattamento", "promo_code": "AUGURI"},
        {"name": "Fidelity VIP", "description": "Dopo 10 visite ricevi un servizio a scelta IN OMAGGIO", "rule_type": "loyalty_vip", "free_service_name": "Servizio a Scelta", "promo_code": "VIP10"},
        {"name": "Card Prepagata -15%", "description": "Acquista una card prepagata e ottieni il 15% di sconto su tutti i servizi", "rule_type": "promo_code", "free_service_name": "Sconto 15% su tutti i servizi", "promo_code": "CARD15"},
        {"name": "Abbonamento Mensile + Piega Omaggio", "description": "Sottoscrivi un abbonamento mensile e ricevi una piega extra IN OMAGGIO ogni mese", "rule_type": "promo_code", "free_service_name": "Piega Omaggio Mensile", "promo_code": "ABBO"},
    ]
    for d in defaults:
        promo = {
            "id": str(uuid.uuid4()), "user_id": user_id,
            **d, "active": True, "show_on_booking": True, "usage_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.promotions.insert_one(promo)


@router.get("/promotions")
async def get_promotions(current_user: dict = Depends(get_current_user)):
    promos = await db.promotions.find({"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    if not promos:
        await seed_default_promotions(current_user["id"])
        promos = await db.promotions.find({"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    for promo in promos:
        promo["usage_count"] = await db.promo_usage.count_documents({"promo_id": promo["id"]})
    return promos


@router.post("/promotions")
async def create_promotion(data: PromoCreate, current_user: dict = Depends(get_current_user)):
    code = data.promo_code
    if not code and data.rule_type == "promo_code":
        code = f"MBHS{uuid.uuid4().hex[:6].upper()}"
    elif not code:
        code = data.rule_type.upper()[:4] + uuid.uuid4().hex[:4].upper()
    promo = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "name": data.name, "description": data.description, "rule_type": data.rule_type,
        "free_service_name": data.free_service_name, "promo_code": code,
        "active": data.active, "show_on_booking": data.show_on_booking, "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promotions.insert_one(promo)
    return {k: v for k, v in promo.items() if k not in ("_id", "user_id")}


@router.put("/promotions/{promo_id}")
async def update_promotion(promo_id: str, data: PromoUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.promotions.update_one({"id": promo_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    promo = await db.promotions.find_one({"id": promo_id}, {"_id": 0, "user_id": 0})
    promo["usage_count"] = await db.promo_usage.count_documents({"promo_id": promo_id})
    return promo


@router.delete("/promotions/{promo_id}")
async def delete_promotion(promo_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.promotions.delete_one({"id": promo_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    return {"success": True}


@router.get("/promotions/check/{client_id}")
async def check_client_promotions(client_id: str, current_user: dict = Depends(get_current_user)):
    promos = await db.promotions.find({"user_id": current_user["id"], "active": True}, {"_id": 0, "user_id": 0}).to_list(50)
    eligible = []
    for promo in promos:
        rt = promo["rule_type"]
        if rt == "first_visit":
            count = await db.appointments.count_documents({"client_id": client_id, "user_id": current_user["id"], "status": "completed"})
            if count == 0:
                eligible.append(promo)
        elif rt == "fidelity_vip":
            count = await db.appointments.count_documents({"client_id": client_id, "user_id": current_user["id"], "status": "completed"})
            if count >= 10:
                recent = await db.promo_usage.find_one({
                    "promo_id": promo["id"], "client_id": client_id,
                    "used_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}
                })
                if not recent:
                    eligible.append(promo)
        else:
            eligible.append(promo)
    return eligible


@router.post("/promotions/{promo_id}/use")
async def use_promotion(promo_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    promo = await db.promotions.find_one({"id": promo_id, "user_id": current_user["id"]}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Promozione non trovata")
    usage = {
        "id": str(uuid.uuid4()), "promo_id": promo_id, "user_id": current_user["id"],
        "client_id": data.get("client_id", ""), "client_name": data.get("client_name", ""),
        "appointment_id": data.get("appointment_id", ""), "free_service": promo["free_service_name"],
        "used_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promo_usage.insert_one(usage)
    return {"success": True}


@router.post("/promotions/{promo_id}/validate-code")
async def validate_promo_code(promo_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    code = data.get("code", "")
    promo = await db.promotions.find_one(
        {"id": promo_id, "user_id": current_user["id"], "promo_code": code, "active": True}, {"_id": 0, "user_id": 0}
    )
    if not promo:
        raise HTTPException(status_code=404, detail="Codice non valido")
    return promo


@router.get("/public/promotions/all")
async def get_all_public_promotions():
    return await db.promotions.find({"active": True, "show_on_booking": True}, {"_id": 0, "user_id": 0}).to_list(20)


@router.get("/public/promotions/{user_id}")
async def get_public_promotions(user_id: str):
    return await db.promotions.find(
        {"user_id": user_id, "active": True, "show_on_booking": True}, {"_id": 0, "user_id": 0}
    ).to_list(20)
