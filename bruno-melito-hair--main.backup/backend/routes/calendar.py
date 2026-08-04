import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Depends, Response
from icalendar import Calendar, Event

from database import db
from auth import get_current_user

router = APIRouter()

ROME_TZ = ZoneInfo("Europe/Rome")


@router.get("/calendar/link")
async def get_calendar_link(current_user: dict = Depends(get_current_user)):
    """Genera (una sola volta) il token del feed calendario dell'utente e restituisce il link .ics
    da inserire come 'calendario da URL' in Google Calendar o iPhone."""
    token = current_user.get("calendar_token")
    if not token:
        token = secrets.token_urlsafe(24)
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"calendar_token": token}})
    return {"feed_path": f"/api/calendar/feed/{token}.ics"}


@router.post("/calendar/link/reset")
async def reset_calendar_link(current_user: dict = Depends(get_current_user)):
    """Invalida il link esistente e ne genera uno nuovo (es. se il link è stato condiviso per errore)."""
    token = secrets.token_urlsafe(24)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"calendar_token": token}})
    return {"feed_path": f"/api/calendar/feed/{token}.ics"}


@router.get("/calendar/feed/{token}.ics")
async def get_calendar_feed(token: str):
    """Feed pubblico letto da Google Calendar/iPhone (nessun header di auth possibile lato loro,
    per questo l'accesso è protetto dal token invece che dal JWT)."""
    user = await db.users.find_one({"calendar_token": token}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Feed non trovato")

    today_str = datetime.now(ROME_TZ).strftime("%Y-%m-%d")
    apts = await db.appointments.find(
        {"user_id": user["id"], "status": {"$ne": "cancelled"}, "date": {"$gte": today_str}},
        {"_id": 0},
    ).sort("date", 1).to_list(500)

    cal = Calendar()
    cal.add("prodid", "-//Bruno Melito Hair//IT//")
    cal.add("version", "2.0")
    cal.add("x-wr-calname", "Bruno Melito Hair — Appuntamenti")

    for apt in apts:
        try:
            start_dt = datetime.strptime(f"{apt['date']}T{apt['time']}", "%Y-%m-%dT%H:%M").replace(tzinfo=ROME_TZ)
        except (KeyError, ValueError):
            continue
        end_dt = start_dt + timedelta(minutes=apt.get("total_duration", 60))

        event = Event()
        services_txt = ", ".join(s.get("name", "") for s in apt.get("services", []))
        event.add("summary", f"✂️ {apt.get('client_name', 'Cliente')} - {services_txt}")
        event.add("dtstart", start_dt)
        event.add("dtend", end_dt)
        event.add("description", f"Operatore: {apt.get('operator_name', 'N/D')}\nNote: {apt.get('notes', '')}")
        event.add("uid", f"{apt['id']}@brunomelitohair.it")
        cal.add_component(event)

    return Response(content=cal.to_ical(), media_type="text/calendar; charset=utf-8")
