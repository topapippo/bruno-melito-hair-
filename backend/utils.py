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
WA_FOOTER = "\n\nMessaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526. Grazie!"

# Inizializzazione Twilio
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

async def send_whatsapp_template(phone: str, template_name: str, variables: list = None, lang: str = "it") -> dict:
    """Invia un template ufficiale via Meta."""
    if not WA_TOKEN: return {"sent": False, "error": "Token non configurato"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    parameters = [{"type": "text", "text": str(v)} for v in (variables or [])]
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_clean,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang},
            "components": [{"type": "body", "parameters": parameters}]
        }
    }
    
    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        rjson = resp.json()
        if resp.status_code == 200:
            return {"sent": True, "method": "cloud_api_template", "message_id": rjson.get("messages", [{}])[0].get("id")}
        else:
            # Fallback it_IT if it fails with 404
            if lang == "it" and resp.status_code == 404:
                return await send_whatsapp_template(phone, template_name, variables, lang="it_IT")
            return {"sent": False, "error": rjson.get("error", {}).get("message", "Errore API"), "code": resp.status_code}
    except Exception as e:
        return {"sent": False, "error": str(e)}

async def send_whatsapp_cloud(phone: str, message: str) -> dict:
    """Invia un messaggio di testo libero via Cloud API."""
    if not WA_TOKEN: return {"sent": False, "error": "Token mancante"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_clean,
        "type": "text",
        "text": {"body": message}
    }
    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        return {"sent": resp.status_code == 200, "method": "cloud_api_text", "data": resp.text}
    except Exception as e:
        return {"sent": False, "error": str(e)}

async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    """Funzione principale d'invio: riconosce i promemoria e usa i template."""
    m_lower = message.lower()
    
    # Riconosce i promemoria dell'agenda o delle schede cliente
    if "appuntamento" in m_lower or "ti ricordiamo" in m_lower or "domani alle" in m_lower:
        nome = "Cliente"
        if "!" in message: nome = message.split('!')[0].replace('Ciao ', '').strip()
        nome = nome.replace(' !', '')
        
        ora = re.search(r'(\d{2}:\d{2})', message)
        ora_str = ora.group(1) if ora else "da concordare"
        
        data_str = "domani"
        data_match = re.search(r'(\d{2}/\d{2}/\d{4})', message)
        if data_match: data_str = data_match.group(1)
        
        # Usa il modello approvato su Meta
        return await send_whatsapp_template(phone, "promemoria_bruno_melito_hair_it", [data_str, ora_str])

    # Riconosce le conferme di prenotazione online
    if "confermato" in m_lower and "prenotazione" in m_lower:
        nome = message.split('!')[0].replace('Ciao ', '').strip() if "!" in message else "Cliente"
        nome = nome.replace(' !', '')
        data = re.search(r'il (\d{2}/\d{2}/\d{4})', message)
        ora = re.search(r'(\d{2}:\d{2})', message)
        return await send_whatsapp_template(phone, "promemoria_bruno_melito_hair_it", [data.group(1) if data else "prossimamente", ora.group(1) if ora else ""])

    return await send_whatsapp_cloud(phone, message + WA_FOOTER)

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
