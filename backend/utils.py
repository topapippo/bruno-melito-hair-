import os, asyncio, requests as _req, re, uuid as _uuid
from datetime import datetime, timezone

TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '1030164126858033')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')
WA_FOOTER = "\n\nMessaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526."

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except: pass

def normalize_phone_wa(phone: str) -> str:
    d = re.sub(r'\D', '', str(phone))
    if d.startswith('0039'): d = d[4:]
    elif d.startswith('39') and len(d) > 10: d = d[2:]
    return '39' + d

async def send_whatsapp_template(phone: str, template_name: str, variables: list = None, lang: str = "it") -> dict:
    if not WA_TOKEN: return {"sent": False, "error": "Token mancante"}
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp", "to": normalize_phone_wa(phone), "type": "template",
        "template": {
            "name": template_name, "language": {"code": lang},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in (variables or [])]}]
        }
    }
    resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
    if resp.status_code == 200: return {"sent": True}
    if lang == "it" and resp.status_code == 404: # Fallback automatico
        return await send_whatsapp_template(phone, template_name, variables, lang="it_IT")
    return {"sent": False, "error": resp.text}

async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    if "Domani alle" in message:
        nome = message.split('!')[0].replace('Ciao ', '').strip()
        ora = re.search(r'alle (\d{2}:\d{2})', message)
        return await send_whatsapp_template(phone, "reminders_appuntamento", [nome, "domani", ora.group(1) if ora else "da concordare"])
    if "confermato" in message.lower() and "prenotazione" in message.lower():
        nome = message.split('!')[0].replace('Ciao ', '').strip()
        data = re.search(r'il (\d{2}/\d{2}/\d{4})', message)
        ora = re.search(r'alle (\d{2}:\d{2})', message)
        return await send_whatsapp_template(phone, "conferma_prenotazione", [nome, data.group(1) if data else "prossimamente", ora.group(1) if ora else ""])
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": normalize_phone_wa(phone), "type": "text", "text": {"body": message + WA_FOOTER}}
    try:
        r = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        return {"sent": r.status_code == 200}
    except: return {"sent": False}

def calculate_end_time(s: str, d: int) -> str:
    try:
        h, m = map(int, s.split(':'))
        t = h * 60 + m + d
        return f"{min(23, t // 60):02d}:{t % 60:02d}"
    except: return s

# Alias per compatibilità con reminders.py
send_whatsapp_cloud = send_whatsapp

async def send_sms_reminder(phone: str, message: str, salon_name: str) -> dict:
    if not twilio_client: return {"success": False}
    try:
        twilio_client.messages.create(body=f"[{salon_name}] {message}", from_=TWILIO_PHONE_NUMBER, to=f"+{normalize_phone_wa(phone)}")
        return {"success": True}
    except: return {"success": False}
