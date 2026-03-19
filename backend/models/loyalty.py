from pydantic import BaseModel
from typing import List, Optional

from database import db


class PrepaidCardCreate(BaseModel):
    client_id: str
    card_type: str
    name: str
    total_value: float
    total_services: Optional[int] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = ""

class PrepaidCardResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    card_type: str
    name: str
    total_value: float
    remaining_value: float
    total_services: Optional[int]
    used_services: int
    valid_until: Optional[str]
    notes: str
    active: bool
    created_at: str
    transactions: List[dict]

class PrepaidCardUpdate(BaseModel):
    name: Optional[str] = None
    total_value: Optional[float] = None
    remaining_value: Optional[float] = None
    total_services: Optional[int] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None

class CardTransaction(BaseModel):
    card_id: str
    amount: float
    appointment_id: Optional[str] = None
    description: Optional[str] = ""


class LoyaltyRedeemRequest(BaseModel):
    reward_type: str

LOYALTY_POINTS_PER_EURO = 10

DEFAULT_LOYALTY_REWARDS = {
    "sconto_colorazione": {
        "name": "Sconto 10% Colorazione",
        "description": "Sconto del 10% sul prossimo servizio di colorazione",
        "points_required": 5,
        "discount_percent": 10,
    },
    "taglio_gratuito": {
        "name": "Taglio Gratuito",
        "description": "Un taglio completamente gratuito",
        "points_required": 10,
    }
}


async def get_loyalty_rewards(user_id: str):
    rewards = await db.loyalty_rewards.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    if rewards:
        return {r["key"]: r for r in rewards}
    return DEFAULT_LOYALTY_REWARDS
