from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import LoyaltyRedeemRequest, get_loyalty_rewards, LOYALTY_POINTS_PER_EURO

router = APIRouter()


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


@router.get("/loyalty")
async def get_all_loyalty(current_user: dict = Depends(get_current_user)):
    loyalties = await db.loyalty.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    for loy in loyalties:
        client = await db.clients.find_one(
            {"id": loy["client_id"], "user_id": current_user["id"]}, {"_id": 0, "name": 1, "phone": 1}
        )
        loy["client_name"] = client["name"] if client else "Sconosciuto"
        loy["client_phone"] = client.get("phone", "") if client else ""
    return loyalties


@router.get("/loyalty/config")
async def get_loyalty_config(current_user: dict = Depends(get_current_user)):
    rewards = await get_loyalty_rewards(current_user["id"])
    return {"points_per_euro": LOYALTY_POINTS_PER_EURO, "rewards": rewards}


@router.put("/loyalty/config")
async def update_loyalty_config(data: dict, current_user: dict = Depends(get_current_user)):
    rewards = data.get("rewards", {})
    for key, reward in rewards.items():
        reward["key"] = key
        reward["user_id"] = current_user["id"]
        await db.loyalty_rewards.update_one(
            {"key": key, "user_id": current_user["id"]}, {"$set": reward}, upsert=True
        )
    updated = await get_loyalty_rewards(current_user["id"])
    return {"points_per_euro": LOYALTY_POINTS_PER_EURO, "rewards": updated}


@router.get("/loyalty/{client_id}")
async def get_client_loyalty(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    loyalty = await get_or_create_loyalty(client_id, current_user["id"])
    loyalty["client_name"] = client["name"]
    loyalty["rewards_config"] = await get_loyalty_rewards(current_user["id"])
    return loyalty


@router.post("/loyalty/{client_id}/redeem")
async def redeem_loyalty_reward(client_id: str, data: LoyaltyRedeemRequest, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    rewards = await get_loyalty_rewards(current_user["id"])
    reward = rewards.get(data.reward_type)
    if not reward:
        raise HTTPException(status_code=400, detail="Tipo di premio non valido")
    loyalty = await get_or_create_loyalty(client_id, current_user["id"])
    if loyalty["points"] < reward["points_required"]:
        raise HTTPException(status_code=400, detail=f"Punti insufficienti. Necessari: {reward['points_required']}, Disponibili: {loyalty['points']}")
    reward_record = {
        "id": str(uuid.uuid4()), "reward_type": data.reward_type, "reward_name": reward["name"],
        "points_spent": reward["points_required"], "redeemed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    history_entry = {
        "id": str(uuid.uuid4()), "type": "redeemed", "points": -reward["points_required"],
        "description": f"Riscattato: {reward['name']}", "date": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty.update_one(
        {"id": loyalty["id"]},
        {"$inc": {"points": -reward["points_required"], "total_points_redeemed": reward["points_required"]},
         "$push": {"history": history_entry, "active_rewards": reward_record}}
    )
    return {"success": True, "message": f"Premio '{reward['name']}' riscattato con successo!",
            "reward": reward_record, "remaining_points": loyalty["points"] - reward["points_required"]}


@router.post("/loyalty/{client_id}/use-reward/{reward_id}")
async def use_loyalty_reward(client_id: str, reward_id: str, current_user: dict = Depends(get_current_user)):
    loyalty = await db.loyalty.find_one({"client_id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not loyalty:
        raise HTTPException(status_code=404, detail="Record fedeltà non trovato")
    updated = False
    active_rewards = loyalty.get("active_rewards", [])
    for r in active_rewards:
        if r["id"] == reward_id and not r["redeemed"]:
            r["redeemed"] = True
            r["used_at"] = datetime.now(timezone.utc).isoformat()
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Premio non trovato o già utilizzato")
    await db.loyalty.update_one({"id": loyalty["id"]}, {"$set": {"active_rewards": active_rewards}})
    return {"success": True, "message": "Premio utilizzato con successo!"}


@router.post("/loyalty/{client_id}/add-points")
async def add_manual_points(client_id: str, points: int, description: str = "Punti aggiunti manualmente", current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id, "user_id": current_user["id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    loyalty = await get_or_create_loyalty(client_id, current_user["id"])
    history_entry = {
        "id": str(uuid.uuid4()), "type": "manual", "points": points,
        "description": description, "date": datetime.now(timezone.utc).isoformat()
    }
    await db.loyalty.update_one(
        {"id": loyalty["id"]},
        {"$inc": {"points": points, "total_points_earned": max(0, points)},
         "$push": {"history": history_entry}}
    )
    return {"success": True, "message": f"{points} punti aggiunti a {client['name']}"}


@router.put("/loyalty/{client_id}/adjust-points")
async def adjust_loyalty_points(client_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    points = data.get("points", 0)
    reason = data.get("reason", "Modifica manuale")
    loyalty = await get_or_create_loyalty(client_id, current_user["id"])
    new_points = max(0, loyalty["points"] + points)
    await db.loyalty.update_one(
        {"client_id": client_id, "user_id": current_user["id"]}, {"$set": {"points": new_points}}
    )
    await db.loyalty_log.insert_one({
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "client_id": client_id, "points_change": points, "reason": reason,
        "new_total": new_points, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "new_points": new_points}
