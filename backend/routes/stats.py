from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
import io
import os
import logging

from database import db
from auth import get_current_user
from models import SettingsUpdate, UserResponse
from utils import twilio_client, TWILIO_PHONE_NUMBER, normalize_phone_wa

router = APIRouter()
logger = logging.getLogger(__name__)


async def sum_payments(uid: str, start_date: str, end_date: str) -> float:
    """Somma total_paid di tutti i pagamenti dell'utente nell'intervallo di date
    (incluso start e end). Helper condiviso usato da dashboard, daily-summary
    e revenue per evitare di ricalcolare lo stesso aggregato con codice
    leggermente diverso in più punti. Aggregation pipeline invece di to_list+sum
    in Python: evita di caricare in RAM tutti i pagamenti del periodo."""
    agg = await db.payments.aggregate([
        {"$match": {"user_id": uid, "date": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_paid"}}}
    ]).to_list(1)
    return agg[0]["total"] if agg else 0


# ============== DASHBOARD ==============

@router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    now_utc = datetime.now(timezone.utc)
    today = now_utc.strftime("%Y-%m-%d")
    first_of_month = now_utc.replace(day=1).strftime("%Y-%m-%d")
    last_of_month = ((now_utc.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)).strftime("%Y-%m-%d")
    first_of_year = now_utc.replace(month=1, day=1).strftime("%Y-%m-%d")
    last_of_year = now_utc.replace(month=12, day=31).strftime("%Y-%m-%d")
    next_week = (now_utc + timedelta(days=7)).strftime("%Y-%m-%d")

    # Tutte le query in parallelo — da ~10 roundtrip sequenziali a 1 batch
    (
        today_appointments,
        total_clients,
        total_operators,
        monthly_appointments_count,
        monthly_revenue,
        yearly_appointments_count,
        yearly_agg,
        upcoming,
        today_revenue,
        sospeso_payments,
        waitlist_count,
    ) = await asyncio.gather(
        db.appointments.find({"user_id": uid, "date": today, "status": {"$ne": "cancelled"}}, {"_id": 0, "user_id": 0}).sort("time", 1).to_list(100),
        db.clients.count_documents({"user_id": uid}),
        db.operators.count_documents({"user_id": uid, "active": True}),
        db.appointments.count_documents({"user_id": uid, "date": {"$gte": first_of_month, "$lte": last_of_month}, "status": "completed"}),
        sum_payments(uid, first_of_month, last_of_month),
        db.appointments.count_documents({"user_id": uid, "date": {"$gte": first_of_year, "$lte": last_of_year}, "status": "completed"}),
        db.payments.aggregate([
            {"$match": {"user_id": uid, "date": {"$gte": first_of_year, "$lte": last_of_year}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_paid"}}}
        ]).to_list(1),
        db.appointments.find({"user_id": uid, "date": {"$gte": today, "$lte": next_week}, "status": "scheduled"}, {"_id": 0, "user_id": 0}).sort([("date", 1), ("time", 1)]).to_list(10),
        sum_payments(uid, today, today),
        db.payments.find({"user_id": uid, "payment_method": "sospeso"}, {"_id": 0, "total_paid": 1}).to_list(1000),
        db.waitlist.count_documents({"user_id": uid, "status": "waiting"}),
    )

    yearly_revenue = yearly_agg[0]["total"] if yearly_agg else 0
    sospeso_count = len(sospeso_payments)
    sospeso_total = sum(p.get("total_paid", 0) for p in sospeso_payments)

    now_time = now_utc.strftime("%H:%M")
    in_2h_time = (now_utc + timedelta(hours=2)).strftime("%H:%M")
    next_2h = [
        a for a in today_appointments
        if a.get("status") != "cancelled" and now_time <= a.get("time", "00:00") <= in_2h_time
    ]

    opening = current_user.get("opening_time", "09:00")
    closing = current_user.get("closing_time", "19:00")
    def _to_min(t):
        try:
            h, m = t.split(":")
            return int(h) * 60 + int(m)
        except Exception:
            return 0
    total_slots = max(0, (_to_min(closing) - _to_min(opening)) // 15) * max(1, total_operators)
    occupied_slots = sum(
        max(1, (a.get("total_duration") or sum(s.get("duration", 15) for s in a.get("services", []))) // 15)
        for a in today_appointments if a.get("status") != "cancelled"
    )
    free_slots = max(0, total_slots - occupied_slots)

    return {
        "today_appointments": today_appointments, "today_appointments_count": len(today_appointments),
        "today_revenue": today_revenue,
        "total_clients": total_clients, "total_operators": total_operators,
        "monthly_revenue": monthly_revenue, "monthly_appointments": monthly_appointments_count,
        "monthly_target": current_user.get("monthly_target", 0) or 0,
        "yearly_revenue": yearly_revenue, "yearly_appointments": yearly_appointments_count,
        "upcoming_appointments": upcoming,
        "sospeso_count": sospeso_count, "sospeso_total": sospeso_total,
        "next_2h": next_2h, "free_slots": free_slots,
        "waitlist_count": waitlist_count,
    }


@router.get("/stats/daily-summary")
async def get_daily_summary(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if date:
        try:
            target_date = datetime.strptime(date.strip()[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            target_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    else:
        target_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.strptime(target_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    today_apts = await db.appointments.find(
        {"user_id": current_user["id"], "date": target_date, "status": {"$ne": "cancelled"}}, {"_id": 0, "user_id": 0}
    ).to_list(200)
    yesterday_apts = await db.appointments.find(
        {"user_id": current_user["id"], "date": yesterday, "status": {"$ne": "cancelled"}}, {"_id": 0, "user_id": 0}
    ).to_list(200)
    completed = [a for a in today_apts if a.get("status") == "completed"]
    # Incassi reali dal db.payments (checkout contanti + vendite abbonamento, esclude consumi carta)
    total_earnings = await sum_payments(current_user["id"], target_date, target_date)
    yesterday_earnings = await sum_payments(current_user["id"], yesterday, yesterday)
    hourly = {f"{h:02d}:00": 0 for h in range(8, 21)}
    for apt in today_apts:
        hour = apt.get("time", "09:00")[:2] + ":00"
        if hour in hourly:
            hourly[hour] += 1
    service_counts = {}
    for apt in today_apts:
        for svc in apt.get("services", []):
            name = svc.get("name", "Altro")
            service_counts[name] = service_counts.get(name, 0) + 1
    top_services = sorted(service_counts.items(), key=lambda x: -x[1])[:5]
    unique_clients = set(apt.get("client_name", "") for apt in today_apts if apt.get("client_name"))
    payment_methods = {}
    for apt in completed:
        pm = apt.get("payment_method", "non specificato")
        payment_methods[pm] = payment_methods.get(pm, 0) + 1

    # Sospesi del giorno: importo totale degli appuntamenti pagati come sospeso
    sospeso_payments_today = await db.payments.find(
        {"user_id": current_user["id"], "date": target_date, "payment_method": "sospeso"},
        {"_id": 0, "total_paid": 1, "original_amount": 1}
    ).to_list(200)
    sospeso_amount = round(sum(p.get("original_amount", p.get("total_paid", 0)) for p in sospeso_payments_today), 2)
    sospeso_count = len(sospeso_payments_today)

    # Uscite scadenti nel giorno selezionato (non pagate)
    expenses_due = await db.expenses.find(
        {"user_id": current_user["id"], "due_date": target_date, "paid": False},
        {"_id": 0, "user_id": 0}
    ).to_list(100)
    # Uscite già scadute precedentemente (overdue rispetto al giorno selezionato)
    expenses_overdue = await db.expenses.find(
        {"user_id": current_user["id"], "due_date": {"$lt": target_date}, "paid": False},
        {"_id": 0, "user_id": 0}
    ).to_list(100)
    total_expenses_due = round(sum(e.get("amount", 0) for e in expenses_due), 2)

    return {
        "date": target_date, "total_appointments": len(today_apts),
        "completed_appointments": len(completed), "total_earnings": total_earnings,
        "yesterday_earnings": yesterday_earnings, "earnings_diff": total_earnings - yesterday_earnings,
        "unique_clients": len(unique_clients),
        "avg_per_client": round(total_earnings / len(unique_clients), 2) if unique_clients else 0,
        "hourly_distribution": hourly,
        "top_services": [{"name": s[0], "count": s[1]} for s in top_services],
        "payment_methods": payment_methods,
        "busiest_hour": max(hourly, key=hourly.get) if any(hourly.values()) else None,
        "busiest_hour_count": max(hourly.values()) if any(hourly.values()) else 0,
        "expenses_due_today": expenses_due,
        "expenses_overdue": expenses_overdue,
        "total_expenses_due": total_expenses_due,
        "net_earnings": round(total_earnings - total_expenses_due, 2),
        "sospeso_amount": sospeso_amount,
        "sospeso_count": sospeso_count,
    }


@router.get("/stats/revenue")
async def get_revenue_stats(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    # Ricavi reali: da payments (checkout contanti + vendite abbonamento, esclude consumi carta prepagata)
    payments = await db.payments.find(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0, "date": 1, "total_paid": 1, "services": 1, "payment_method": 1}
    ).to_list(10000)
    daily_revenue = {}
    for p in payments:
        d = p["date"][:10]
        daily_revenue[d] = daily_revenue.get(d, 0) + p.get("total_paid", 0)
    total_revenue = sum(daily_revenue.values())
    # Service breakdown da payments (include servizi checkout e "Vendita: abbonamento")
    service_revenue = {}
    for p in payments:
        for svc in p.get("services", []):
            name = svc.get("name", "Altro")
            if name not in service_revenue:
                service_revenue[name] = {"count": 0, "revenue": 0}
            service_revenue[name]["count"] += 1
            service_revenue[name]["revenue"] += svc.get("price", 0)
    # Operator breakdown da appuntamenti completati NON prepagati
    # (gli appuntamenti prepagati non generano nuovo cassa, ma il lavoro è stato svolto: contiamo solo il ricavo effettivo)
    appointments = await db.appointments.find(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date},
         "status": "completed", "payment_method": {"$ne": "prepaid"}},
        {"_id": 0, "client_id": 1, "client_name": 1, "total_price": 1}
    ).to_list(10000)
    # Aggiunge anche gli appuntamenti senza payment_method (vecchi record pre-abbonamento)
    appointments_no_method = await db.appointments.find(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date},
         "status": "completed", "payment_method": {"$exists": False}},
        {"_id": 0, "client_id": 1, "client_name": 1, "total_price": 1}
    ).to_list(10000)
    all_cash_appointments = appointments + appointments_no_method
    # Fascia oraria (tutti gli appuntamenti del periodo, non solo completati)
    all_period_apts = await db.appointments.find(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date}, "status": {"$ne": "cancelled"}},
        {"_id": 0, "time": 1}
    ).to_list(10000)
    hourly_counts = {f"{h:02d}:00": 0 for h in range(8, 21)}
    for apt in all_period_apts:
        hour_key = apt.get("time", "")[:2] + ":00"
        if hour_key in hourly_counts:
            hourly_counts[hour_key] += 1

    # Confronto con periodo precedente (stessa durata, giorno prima dell'inizio)
    try:
        from datetime import date as ddate
        sd = ddate.fromisoformat(start_date)
        ed = ddate.fromisoformat(end_date)
        duration_days = (ed - sd).days + 1
        prev_end = sd - timedelta(days=1)
        prev_start = prev_end - timedelta(days=duration_days - 1)
        prev_revenue = await sum_payments(current_user["id"], prev_start.isoformat(), prev_end.isoformat())
        prev_apts_count = await db.appointments.count_documents(
            {"user_id": current_user["id"], "date": {"$gte": prev_start.isoformat(), "$lte": prev_end.isoformat()}, "status": "completed"}
        )
    except Exception:
        prev_revenue = 0
        prev_apts_count = 0

    # Top clienti per numero di visite
    client_counts = {}
    for apt in all_cash_appointments:
        cname = apt.get("client_name", "Sconosciuto")
        cid = apt.get("client_id", "")
        if cid and cid not in ("", "generic"):
            if cid not in client_counts:
                client_counts[cid] = {"name": cname, "visits": 0, "revenue": 0}
            client_counts[cid]["visits"] += 1
            client_counts[cid]["revenue"] += apt.get("total_price", 0)
    top_clients = sorted(client_counts.values(), key=lambda x: x["visits"], reverse=True)[:5]

    # Metodi di pagamento
    payment_methods_map = {}
    for p in payments:
        pm = p.get("payment_method", "altro")
        if pm not in payment_methods_map:
            payment_methods_map[pm] = {"method": pm, "count": 0, "total": 0}
        payment_methods_map[pm]["count"] += 1
        payment_methods_map[pm]["total"] += p.get("total_paid", 0)

    # Breakdown per categoria — mappa nome servizio → categoria dalla collection services
    all_services_list = await db.services.find({"user_id": current_user["id"]}, {"_id": 0, "name": 1, "category": 1}).to_list(500)
    name_to_cat = {s["name"]: s.get("category", "altro") for s in all_services_list}
    category_revenue_map = {}
    for name, data in service_revenue.items():
        cat = name_to_cat.get(name, "altro")
        if cat not in category_revenue_map:
            category_revenue_map[cat] = {"category": cat, "count": 0, "revenue": 0}
        category_revenue_map[cat]["count"] += data["count"]
        category_revenue_map[cat]["revenue"] += data["revenue"]

    return {
        "total_revenue": total_revenue, "total_appointments": len(all_cash_appointments),
        "daily_revenue": [{"date": k, "revenue": v} for k, v in sorted(daily_revenue.items())],
        "service_breakdown": [{"name": k, **v} for k, v in sorted(service_revenue.items(), key=lambda x: x[1]["revenue"], reverse=True)],
        "hourly_distribution": [{"hour": k, "count": v} for k, v in sorted(hourly_counts.items())],
        "prev_period_revenue": prev_revenue,
        "prev_period_appointments": prev_apts_count,
        "top_clients": top_clients,
        "payment_methods": sorted(payment_methods_map.values(), key=lambda x: x["total"], reverse=True),
        "category_breakdown": sorted(category_revenue_map.values(), key=lambda x: x["revenue"], reverse=True),
    }


@router.get("/stats/clients")
async def get_client_stats(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    total_clients = await db.clients.count_documents({"user_id": uid})

    new_clients = await db.clients.find(
        {"user_id": uid, "created_at": {"$gte": start_date, "$lte": end_date + "T23:59:59.999Z"}},
        {"_id": 0, "id": 1, "name": 1, "created_at": 1}
    ).to_list(10000)

    appointments = await db.appointments.find(
        {"user_id": uid, "date": {"$gte": start_date, "$lte": end_date}, "status": "completed"},
        {"_id": 0, "client_id": 1, "client_name": 1, "total_price": 1, "date": 1}
    ).to_list(5000)

    client_visits = {}
    for apt in appointments:
        cid = apt.get("client_id", "")
        if not cid or cid == "generic":
            continue
        if cid not in client_visits:
            client_visits[cid] = {"name": apt.get("client_name", "Sconosciuto"), "visits": 0, "revenue": 0}
        client_visits[cid]["visits"] += 1
        client_visits[cid]["revenue"] += apt.get("total_price", 0)

    active_clients = len(client_visits)
    returning_clients = sum(1 for cv in client_visits.values() if cv["visits"] > 1)
    avg_visits = sum(cv["visits"] for cv in client_visits.values()) / len(client_visits) if client_visits else 0

    freq_dist = {}
    for cv in client_visits.values():
        v = str(cv["visits"])
        freq_dist[v] = freq_dist.get(v, 0) + 1

    new_by_month = {}
    for c in new_clients:
        month = c["created_at"][:7]
        new_by_month[month] = new_by_month.get(month, 0) + 1

    top_by_visits = sorted(client_visits.values(), key=lambda x: x["visits"], reverse=True)[:10]
    top_by_revenue = sorted(
        [{"name": cv["name"], "revenue": round(cv["revenue"], 2), "visits": cv["visits"]} for cv in client_visits.values()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]

    return {
        "total_clients": total_clients,
        "new_clients_period": len(new_clients),
        "active_clients": active_clients,
        "returning_clients": returning_clients,
        "avg_visits_per_client": round(avg_visits, 1),
        "top_by_visits": top_by_visits,
        "top_by_revenue": top_by_revenue,
        "visit_frequency": [{"visits": int(k), "clients": v} for k, v in sorted(freq_dist.items(), key=lambda x: int(x[0]))],
        "new_clients_trend": [{"month": k, "count": v} for k, v in sorted(new_by_month.items())],
    }


@router.get("/stats/expenses-stats")
async def get_expense_stats(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    from datetime import date as ddate

    paid_expenses = await db.expenses.find(
        {"user_id": uid, "paid": True, "paid_date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0, "user_id": 0}
    ).to_list(10000)

    unpaid_expenses = await db.expenses.find(
        {"user_id": uid, "paid": False},
        {"_id": 0, "user_id": 0}
    ).to_list(10000)

    today = ddate.today().isoformat()
    overdue = [e for e in unpaid_expenses if e.get("due_date", "") < today]
    total_paid = sum(e.get("amount", 0) for e in paid_expenses)

    by_category = {}
    for e in paid_expenses:
        cat = e.get("category", "altro")
        if cat not in by_category:
            by_category[cat] = {"category": cat, "count": 0, "total": 0}
        by_category[cat]["count"] += 1
        by_category[cat]["total"] += e.get("amount", 0)

    by_month = {}
    for e in paid_expenses:
        month = (e.get("paid_date") or e.get("due_date", ""))[:7]
        if month:
            by_month[month] = by_month.get(month, 0) + e.get("amount", 0)

    try:
        sd = ddate.fromisoformat(start_date)
        ed = ddate.fromisoformat(end_date)
        duration_days = (ed - sd).days + 1
        prev_end = sd - timedelta(days=1)
        prev_start = prev_end - timedelta(days=duration_days - 1)
        prev_expenses = await db.expenses.find(
            {"user_id": uid, "paid": True, "paid_date": {"$gte": prev_start.isoformat(), "$lte": prev_end.isoformat()}},
            {"_id": 0, "amount": 1}
        ).to_list(10000)
        prev_total = sum(e.get("amount", 0) for e in prev_expenses)
    except Exception:
        prev_total = 0

    return {
        "total_expenses": round(total_paid, 2),
        "total_expenses_count": len(paid_expenses),
        "total_unpaid": round(sum(e.get("amount", 0) for e in unpaid_expenses), 2),
        "total_overdue": round(sum(e.get("amount", 0) for e in overdue), 2),
        "overdue_count": len(overdue),
        "by_category": sorted(
            [{"category": k, "count": v["count"], "total": round(v["total"], 2)} for k, v in by_category.items()],
            key=lambda x: x["total"], reverse=True
        ),
        "monthly_trend": [{"month": k, "total": round(v, 2)} for k, v in sorted(by_month.items())],
        "prev_period_expenses": round(prev_total, 2),
        "recent_expenses": paid_expenses[:10],
    }


@router.get("/stats/export-pdf")
async def export_stats_pdf(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    # Ricavi reali da payments
    payments = await db.payments.find(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0, "total_paid": 1, "services": 1}
    ).to_list(10000)
    total_revenue = sum(p.get("total_paid", 0) for p in payments)
    service_stats = {}
    for p in payments:
        for svc in p.get("services", []):
            name = svc.get("name", "Altro")
            if name not in service_stats:
                service_stats[name] = {"count": 0, "revenue": 0}
            service_stats[name]["count"] += 1
            service_stats[name]["revenue"] += svc.get("price", 0)
    # Appuntamenti completati non prepagati (esclude consumi carta) — solo conteggio, niente documenti in memoria
    total_appointments = await db.appointments.count_documents(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date},
         "status": "completed", "payment_method": {"$ne": "prepaid"}}
    ) + await db.appointments.count_documents(
        {"user_id": current_user["id"], "date": {"$gte": start_date, "$lte": end_date},
         "status": "completed", "payment_method": {"$exists": False}}
    )
    lines = [
        f"REPORT STATISTICHE - {current_user['salon_name']}", f"Periodo: {start_date} - {end_date}", "",
        "=" * 50, "RIEPILOGO", "=" * 50,
        f"Totale Incasso: €{total_revenue:.2f}", f"Totale Appuntamenti: {total_appointments}",
        f"Media per Appuntamento: €{(total_revenue/total_appointments if total_appointments > 0 else 0):.2f}", "",
        "=" * 50, "SERVIZI", "=" * 50,
    ]
    for name, data in sorted(service_stats.items(), key=lambda x: x[1]["revenue"], reverse=True):
        lines.append(f"{name}: {data['count']} volte - €{data['revenue']:.2f}")
    return StreamingResponse(
        io.BytesIO("\n".join(lines).encode('utf-8')), media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=report_{start_date}_{end_date}.txt"}
    )


@router.get("/stats/weekly-earnings")
async def get_weekly_earnings(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=6)).strftime("%Y-%m-%d")
    payments = await db.payments.find(
        {"user_id": current_user["id"], "date": {"$gte": week_ago, "$lte": today}},
        {"_id": 0, "date": 1, "total_paid": 1}
    ).to_list(2000)
    daily = {}
    for p in payments:
        d = p["date"][:10]
        daily[d] = daily.get(d, 0) + p.get("total_paid", 0)
    result = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        result.append({"date": d, "amount": round(daily.get(d, 0), 2)})
    return result


@router.get("/stats/top-clients")
async def get_top_clients(limit: int = 5, current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find(
        {"user_id": current_user["id"], "client_id": {"$exists": True}},
        {"_id": 0, "client_id": 1, "client_name": 1, "total_paid": 1}
    ).to_list(10000)
    totals = {}
    for p in payments:
        cid = p.get("client_id", "")
        if not cid or cid == "generic": continue
        if cid not in totals:
            totals[cid] = {"name": p.get("client_name", ""), "total": 0, "visits": 0}
        totals[cid]["total"] += p.get("total_paid", 0)
        totals[cid]["visits"] += 1
    top = sorted(totals.values(), key=lambda x: x["total"], reverse=True)[:limit]
    max_total = top[0]["total"] if top else 1
    for c in top:
        c["total"] = round(c["total"], 2)
        c["percent"] = round(c["total"] / max_total * 100) if max_total else 0
    # Aggiungi punti fedeltà
    for c in top:
        pass  # loyalty opzionale, skip per semplicità
    return top


# ============== SETTINGS ==============

@router.put("/settings", response_model=UserResponse)
async def update_settings(data: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return UserResponse(id=user["id"], email=user["email"], name=user["name"],
                        salon_name=user["salon_name"], created_at=user["created_at"])


@router.put("/settings/admin-theme")
async def update_admin_theme(data: dict, current_user: dict = Depends(get_current_user)):
    theme = data.get("admin_theme", {})
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"admin_theme": theme}})
    return {"success": True, "admin_theme": theme}


@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"], "email": current_user["email"],
        "name": current_user["name"], "salon_name": current_user["salon_name"],
        "opening_time": current_user.get("opening_time", "09:00"),
        "closing_time": current_user.get("closing_time", "19:00"),
        "working_days": current_user.get("working_days", ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"]),
        "twilio_configured": twilio_client is not None,
        "admin_theme": current_user.get("admin_theme", {
            "primary": "#C8617A", "sidebar_bg": "#1A0A10", "sidebar_text": "#FAF5FF",
            "accent": "#D4AF7A", "content_bg": "#FDF8F5", "content_text": "#2D1B14",
            "font_display": "Cormorant Garamond", "font_body": "Poppins"
        }),
        "google_review_link": current_user.get("google_review_link", ""),
        "cloud_api_configured": bool(os.environ.get("WHATSAPP_TOKEN")),
        "cloud_api_phone_number_id": os.environ.get("WHATSAPP_PHONE_ID", ""),
        "monthly_target": current_user.get("monthly_target", 0) or 0,
    }


@router.get("/settings/whatsapp-diagnosi")
async def whatsapp_diagnosi(current_user: dict = Depends(get_current_user)):
    """Diagnosi WhatsApp in un colpo solo: controlla Cloud API Meta + i template
    e restituisce un esito in italiano semplice."""
    import asyncio
    import requests as _req

    checks = []  # ogni voce: {nome, ok, dettaglio}

    from utils import WA_TOKEN, WA_PHONE_NUMBER_ID
    cloud_ok = False
    approved_templates = []
    if not WA_TOKEN:
        checks.append({"nome": "WhatsApp ufficiale (Meta)", "ok": False, "dettaglio": "Token non impostato su Render"})
    else:
        waba_id = os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
        if not waba_id:
            checks.append({"nome": "WhatsApp ufficiale (Meta)", "ok": True,
                           "dettaglio": "Token presente. Per vedere i template imposta WHATSAPP_BUSINESS_ACCOUNT_ID su Render."})
            cloud_ok = True
        else:
            try:
                r = await asyncio.to_thread(_req.get, f"https://graph.facebook.com/v21.0/{waba_id}/message_templates",
                                            headers={"Authorization": f"Bearer {WA_TOKEN}"}, params={"limit": 100}, timeout=15)
                rj = r.json()
                if r.status_code == 200:
                    cloud_ok = True
                    approved_templates = [t.get("name") for t in rj.get("data", []) if t.get("status") == "APPROVED"]
                    checks.append({"nome": "WhatsApp ufficiale (Meta)", "ok": True,
                                   "dettaglio": f"Token valido. Template approvati: {', '.join(approved_templates) or 'nessuno'}"})
                else:
                    msg = rj.get("error", {}).get("message", "errore")
                    checks.append({"nome": "WhatsApp ufficiale (Meta)", "ok": False, "dettaglio": f"Token rifiutato da Meta: {msg}"})
            except Exception as e:
                checks.append({"nome": "WhatsApp ufficiale (Meta)", "ok": False, "dettaglio": f"Errore connessione: {str(e)[:120]}"})

    # --- Verdetto in italiano ---
    if cloud_ok and approved_templates:
        verdetto = "✅ Tutto a posto: i messaggi con template approvato possono partire. Il testo libero funziona solo se il cliente ti ha scritto nelle ultime 24h."
    elif cloud_ok:
        verdetto = "⚠️ WhatsApp ufficiale presente ma nessun template approvato — i messaggi automatici NON partono finché non approvi almeno un template su Meta Business Manager."
    else:
        verdetto = "❌ Nessun canale WhatsApp attivo: controlla il token Meta su Render."

    return {"verdetto": verdetto, "controlli": checks, "cloud_ok": cloud_ok}


@router.get("/settings/cloud-api-test")
async def test_cloud_api(current_user: dict = Depends(get_current_user)):
    """Verifica che WHATSAPP_TOKEN e PHONE_NUMBER_ID siano configurati."""
    token = os.environ.get("WHATSAPP_TOKEN", "")
    phone_id = os.environ.get("WHATSAPP_PHONE_ID", "")
    if not token:
        return {"ok": False, "status": "not_configured",
                "message": "WHATSAPP_TOKEN non impostato nelle variabili d'ambiente"}
    return {
        "ok": True,
        "status": "configured",
        "phone_number_id": phone_id,
        "message": f"✅ Cloud API configurata — Phone Number ID: {phone_id}",
    }


@router.post("/settings/cloud-api-send-test")
async def test_cloud_api_send(data: dict, current_user: dict = Depends(get_current_user)):
    """Invia un messaggio di prova via WhatsApp Cloud API (Meta ufficiale)."""
    from utils import send_whatsapp_cloud, WA_TOKEN
    phone = data.get("phone", "")
    if not phone:
        return {"ok": False, "message": "Numero di telefono mancante"}
    if not WA_TOKEN:
        return {"ok": False, "message": "WHATSAPP_TOKEN non configurato nelle variabili d'ambiente di Render"}
    result = await send_whatsapp_cloud(phone, "✅ Test WhatsApp Cloud API — Bruno Melito Hair funziona!")
    if result.get("sent"):
        return {"ok": True,
                "message": f"✅ Messaggio inviato! Message ID: {result.get('message_id', 'ok')}"}
    return {"ok": False,
            "message": f"Errore Cloud API: {result.get('error')} (code={result.get('code')})"}


@router.post("/settings/cloud-api-register-number")
async def register_cloud_api_number(data: dict, current_user: dict = Depends(get_current_user)):
    """Registra il numero Cloud API tramite POST /{phone-id}/register con PIN a 6 cifre.
    Necessario quando il pannello WhatsApp Manager è bloccato e non permette di
    impostare la verifica in due passaggi via UI.
    Risposta completa di Meta inclusa per debug.
    """
    import asyncio
    import requests as _req
    from utils import WA_TOKEN, WA_PHONE_NUMBER_ID

    pin = str(data.get("pin", "")).strip()
    if not pin or not pin.isdigit() or len(pin) != 6:
        return {"ok": False, "message": "PIN deve essere esattamente 6 cifre"}
    if not WA_TOKEN:
        return {"ok": False, "message": "WHATSAPP_TOKEN non configurato su Render"}

    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/register"
    headers = {
        "Authorization": f"Bearer {WA_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"messaging_product": "whatsapp", "pin": pin}

    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=20)
        rjson = {}
        try:
            rjson = resp.json()
        except Exception:
            pass
        logger.info(f"[WA REGISTER] phone_id={WA_PHONE_NUMBER_ID} status={resp.status_code} resp={rjson}")

        if resp.status_code == 200 and rjson.get("success"):
            return {"ok": True,
                    "message": f"✅ Numero {WA_PHONE_NUMBER_ID} registrato con successo!",
                    "raw": rjson}

        error = rjson.get("error", {})
        return {
            "ok": False,
            "message": f"Errore registrazione: {error.get('message') or resp.text[:300]}",
            "code": error.get("code"),
            "subcode": error.get("error_subcode"),
            "details": error.get("error_data") or error.get("error_user_msg") or error.get("error_user_title"),
            "fbtrace_id": error.get("fbtrace_id"),
            "raw": rjson,
            "status_code": resp.status_code,
        }
    except Exception as e:
        return {"ok": False, "message": f"Errore di rete: {str(e)}"}


@router.get("/settings/cloud-api-templates")
async def list_cloud_api_templates(current_user: dict = Depends(get_current_user)):
    """Lista tutti i template WhatsApp registrati su Meta (approvati, in revisione, rifiutati).
    Richiede env var WHATSAPP_BUSINESS_ACCOUNT_ID (WABA ID) su Render."""
    import os as _os
    import asyncio as _asyncio
    import requests as _req
    from utils import WA_TOKEN
    if not WA_TOKEN:
        return {"ok": False, "error": "WHATSAPP_TOKEN non configurato"}
    waba_id = _os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    if not waba_id:
        return {"ok": False, "error": "WHATSAPP_BUSINESS_ACCOUNT_ID env var mancante su Render. Recuperalo da Meta Business Manager → WhatsApp → API Setup."}
    url = f"https://graph.facebook.com/v21.0/{waba_id}/message_templates"
    headers = {"Authorization": f"Bearer {WA_TOKEN}"}
    try:
        resp = await _asyncio.to_thread(_req.get, url, headers=headers, params={"limit": 100}, timeout=15)
        rjson = resp.json()
        if resp.status_code != 200:
            return {"ok": False, "error": rjson.get("error", {}).get("message", "Errore Meta"), "code": resp.status_code, "raw": rjson}
        templates = []
        for t in rjson.get("data", []):
            body_component = next((c for c in t.get("components", []) if c.get("type") == "BODY"), {})
            templates.append({
                "name": t.get("name"),
                "status": t.get("status"),
                "language": t.get("language"),
                "category": t.get("category"),
                "body_text": body_component.get("text", "")[:200],
                "param_count": body_component.get("text", "").count("{{"),
            })
        templates.sort(key=lambda x: (x["status"] != "APPROVED", x["name"]))
        return {"ok": True, "count": len(templates), "approved": [t for t in templates if t["status"] == "APPROVED"], "all": templates}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/settings/cloud-api-send-template-test")
async def test_cloud_api_send_template(data: dict, current_user: dict = Depends(get_current_user)):
    """Invia un template WhatsApp di prova via Meta Cloud API.
    Default: template `hello_world` (en_US) — sempre approvato da Meta."""
    from utils import send_whatsapp_template, WA_TOKEN
    phone = data.get("phone", "")
    template_name = data.get("template_name", "promemoria_appuntamento")
    language_code = data.get("language_code", "it")
    # Variabili di esempio per promemoria_appuntamento: [nome, giorno, ora]
    variables = data.get("variables", ["Cliente", "domani", "10:00"])
    if not phone:
        return {"ok": False, "message": "Numero di telefono mancante"}
    if not WA_TOKEN:
        return {"ok": False, "message": "WHATSAPP_TOKEN non configurato nelle variabili d'ambiente di Render"}
    result = await send_whatsapp_template(phone, template_name, variables=variables, lang=language_code)
    if result.get("sent"):
        return {"ok": True,
                "message": f"✅ Template '{template_name}' inviato! Message ID: {result.get('message_id', 'ok')}"}
    return {"ok": False,
            "message": f"Errore template: {result.get('error')} (code={result.get('code')})",
            "details": result.get("details")}


# ============== RICERCA GLOBALE ==============

@router.get("/search")
async def global_search(q: str = "", current_user: dict = Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return {"clients": [], "appointments": []}
    query_str = q.strip()
    import re as _re
    regex = {"$regex": _re.escape(query_str), "$options": "i"}

    clients = await db.clients.find(
        {"user_id": current_user["id"], "$or": [{"name": regex}, {"phone": regex}]},
        {"_id": 0, "user_id": 0}
    ).to_list(10)

    appointments = await db.appointments.find(
        {"user_id": current_user["id"], "client_name": regex, "status": {"$ne": "cancelled"}},
        {"_id": 0, "user_id": 0, "client_id": 1, "client_name": 1, "date": 1, "time": 1, "services": 1, "status": 1}
    ).sort([("date", -1)]).to_list(10)

    return {"clients": clients, "appointments": appointments}


# ============== PAYMENTS ==============

@router.get("/payments")
async def get_payments(start: str = None, end: str = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if start and end:
        query["date"] = {"$gte": start[:10], "$lte": end[:10]}
    return await db.payments.find(query, {"_id": 0}).sort("date", -1).to_list(1000)


@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    allowed = {"date", "payment_method", "total_paid", "client_name", "notes"}
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato valido da aggiornare")
    result = await db.payments.update_one(
        {"id": payment_id, "user_id": current_user["id"]}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    updated = await db.payments.find_one({"id": payment_id, "user_id": current_user["id"]}, {"_id": 0, "user_id": 0})
    return updated


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    return {"success": True}


