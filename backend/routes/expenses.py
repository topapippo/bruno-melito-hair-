from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
from pydantic import BaseModel

from database import db
from auth import get_current_user

router = APIRouter()


class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: str = "altro"
    due_date: str
    is_recurring: bool = False
    recurrence: Optional[str] = None
    notes: Optional[str] = ""
    paid: Optional[bool] = False
    paid_date: Optional[str] = None

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None
    notes: Optional[str] = None
    paid: Optional[bool] = None
    paid_date: Optional[str] = None


@router.get("/expenses")
async def get_expenses(
    paid: Optional[bool] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if paid is not None:
        query["paid"] = paid
    # Se vengono passate start/end, filtra per paid_date (per il report incassi)
    if start and end:
        start_date = start[:10]
        end_date = end[:10]
        query["paid"] = True
        query["paid_date"] = {"$gte": start_date, "$lte": end_date}
    return await db.expenses.find(query, {"_id": 0, "user_id": 0}).sort("due_date", 1).to_list(500)


@router.post("/expenses")
async def create_expense(data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    is_paid = bool(data.paid)
    paid_date = None
    if is_paid:
        paid_date = data.paid_date or data.due_date or today
    expense = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"],
        "description": data.description, "amount": data.amount,
        "category": data.category, "due_date": data.due_date,
        "is_recurring": data.is_recurring, "recurrence": data.recurrence,
        "notes": data.notes or "", "paid": is_paid, "paid_date": paid_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.expenses.insert_one(expense)
    return {k: v for k, v in expense.items() if k not in ("_id", "user_id")}


@router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: ExpenseUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.expenses.update_one({"id": expense_id, "user_id": current_user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Uscita non trovata")
    return await db.expenses.find_one({"id": expense_id}, {"_id": 0, "user_id": 0})


@router.post("/expenses/{expense_id}/pay")
async def mark_expense_paid(expense_id: str, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = await db.expenses.update_one(
        {"id": expense_id, "user_id": current_user["id"]}, {"$set": {"paid": True, "paid_date": today}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Uscita non trovata")
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if expense and expense.get("is_recurring") and expense.get("recurrence"):
        due = datetime.strptime(expense["due_date"], "%Y-%m-%d")
        next_due = None
        if expense["recurrence"] == "monthly":
            next_due = due.replace(month=due.month % 12 + 1) if due.month < 12 else due.replace(year=due.year + 1, month=1)
        elif expense["recurrence"] == "quarterly":
            next_month = due.month + 3
            next_year = due.year + (next_month - 1) // 12
            next_month = ((next_month - 1) % 12) + 1
            next_due = due.replace(year=next_year, month=next_month)
        elif expense["recurrence"] == "yearly":
            next_due = due.replace(year=due.year + 1)
        if next_due:
            new_expense = {
                "id": str(uuid.uuid4()), "user_id": current_user["id"],
                "description": expense["description"], "amount": expense["amount"],
                "category": expense["category"], "due_date": next_due.strftime("%Y-%m-%d"),
                "is_recurring": True, "recurrence": expense["recurrence"],
                "notes": expense.get("notes", ""), "paid": False, "paid_date": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(new_expense)
    return {"success": True}


@router.post("/expenses/{expense_id}/unpay")
async def mark_expense_unpaid(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.update_one(
        {"id": expense_id, "user_id": current_user["id"]}, {"$set": {"paid": False, "paid_date": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Uscita non trovata")
    return {"success": True}


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Uscita non trovata")
    return {"success": True}


@router.get("/expenses/upcoming")
async def get_upcoming_expenses(days: int = 7, current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    future = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")
    expenses = await db.expenses.find(
        {"user_id": current_user["id"], "paid": False, "due_date": {"$lte": future}},
        {"_id": 0, "user_id": 0}
    ).sort("due_date", 1).to_list(50)
    for exp in expenses:
        exp["overdue"] = exp["due_date"] < today
    return expenses
