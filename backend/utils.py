import os
import asyncio
import requests as _req
import re
import uuid as _uuid
from datetime import datetime, timezone

# --- CONFIGURAZIONI TWILIO ---
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# --- CONFIGURAZIONI WHATSAPP CLOUD API ---
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '1030164126858033')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')
WA_FOOTER = "\n\nQuesto è un messaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526. Grazie!"

# Inizializzazione Twilio (necessario per non rompere le stats)
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except:
        pass

def normalize_phone_wa(phone: str) -> str:
    """Restituisce il numero in formato 393XXXXXXXXX."""
    d = re.sub(r'\D', '', str(phone))
    if d.startswith('0039'): d = d[4:]
    elif d.startswith('39') and len(d) > 10: d = d[2:]
    return '39' + d

def format_phone_e164(phone: str) -> str:
    phone = ''.join(filter(str.isdigit, str(phone)))
    if phone.startswith('39'): return f"+{phone}"
    return f"+39{phone}"

# --- FUNZIONI DI INVIO ---

async def send_whatsapp_template(phone: str, template_name: str, variables: list) -> dict:
    """Invia un template ufficiale via Meta."""
    if not WA_TOKEN: return {"sent": False, "error": "Token non configurato"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    parameters = [{"type": "text", "text": str(v)} for v in variables]
    payload = {
        "messaging_product": "whatsapp", "to": phone_clean, "type": "template",
        "template": {
            "name": template_name, "language": {"code": "it"},
            "components": [{"type": "body", "parameters": parameters}]
        }
    }
    resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
    return {"sent": resp.status_code == 200, "method": "cloud_api_template", "data": resp.text}

async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    """Invia WhatsApp: usa template per i promemoria, testo libero per il resto."""
    if "Domani alle" in message:
        nome = message.split('!')[0].replace('Ciao ', '').strip() or "Cliente"
        ora = re.search(r'alle (\d{2}:\d{2})', message)
        ora_str = ora.group(1) if ora else "da concordare"
        return await send_whatsapp_template(phone, "promemoria_appunta", [nome, "domani", ora_str])
    
    if not WA_TOKEN: return {"sent": False, "error": "Token mancante"}
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": normalize_phone_wa(phone), "type": "text", "text": {"body": message + WA_FOOTER}}
    resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
    return {"sent": resp.status_code == 200, "method": "cloud_api_text"}

async def send_sms_reminder(phone: str, message: str, salon_name: str) -> dict:
    if not twilio_client or not TWILIO_PHONE_NUMBER: return {"success": False, "error": "Twilio non configurato"}
    try:
        phone_e164 = format_phone_e164(phone)
        sms = twilio_client.messages.create(body=f"[{salon_name}] {message}", from_=TWILIO_PHONE_NUMBER, to=phone_e164)
        return {"success": True, "sid": sms.sid}
    except Exception as e: return {"success": False, "error": str(e)}

# --- UTILITY ---
def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    try:
        hours, minutes = map(int, start_time.split(':'))
        total = hours * 60 + minutes + duration_minutes
        if total >= 24 * 60: return "23:59"
        return f"{total // 60:02d}:{total % 60:02d}"
    except: return start_time

async def _log_communication(user_id: str, channel: str, phone: str, message: str, result: dict):
    try:
        from database import db
        await db.communication_logs.insert_one({
            "id": str(_uuid.uuid4()), "user_id": user_id, "channel": channel, "phone": phone,
            "message": message[:500], "sent": result.get("sent", False), "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except: pass
