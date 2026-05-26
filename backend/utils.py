import os
import asyncio
import requests as _req
import re
import uuid as _uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

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

async def _send_ultramsg(phone: str, message: str, user: dict = None) -> dict:
    """Fallback legacy 1: UltraMsg (nessuna restrizione 24h)."""
    if not user:
        return {"sent": False, "error": "user mancante per UltraMsg"}
    instance_id = user.get("ultramsg_instance_id", "")
    token = user.get("ultramsg_token", "")
    if not instance_id or not token:
        return {"sent": False, "error": "UltraMsg non configurato"}
    phone_clean = normalize_phone_wa(phone)
    wa_number = phone_clean + "@c.us"
    try:
        url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
        resp = await asyncio.to_thread(
            _req.post, url,
            data={"token": token, "to": wa_number, "body": message},
            timeout=15
        )
        rjson = {}
        try: rjson = resp.json()
        except Exception: pass
        if resp.status_code == 200 and str(rjson.get("sent", "")).lower() == "true":
            return {"sent": True, "method": "ultramsg"}
        return {"sent": False, "error": str(rjson.get("error") or rjson.get("message") or resp.text[:200]), "method": "ultramsg"}
    except Exception as e:
        return {"sent": False, "error": str(e), "method": "ultramsg"}


async def _send_greenapi(phone: str, message: str, user: dict = None) -> dict:
    """Fallback legacy 2: Green API (nessuna restrizione 24h)."""
    if not user:
        return {"sent": False, "error": "user mancante per Green API"}
    instance_id = user.get("green_api_instance_id", "")
    api_token = user.get("green_api_token", "")
    if not instance_id or not api_token:
        return {"sent": False, "error": "Green API non configurato"}
    phone_clean = normalize_phone_wa(phone)
    wa_number = phone_clean + "@c.us"
    try:
        url = f"https://api.greenapi.com/waInstance{instance_id}/sendMessage/{api_token}"
        resp = await asyncio.to_thread(
            _req.post, url,
            json={"chatId": wa_number, "message": message},
            timeout=15
        )
        rjson = {}
        try: rjson = resp.json()
        except Exception: pass
        if resp.status_code == 200 and rjson.get("idMessage"):
            return {"sent": True, "method": "greenapi"}
        return {"sent": False, "error": resp.text[:200], "method": "greenapi"}
    except Exception as e:
        return {"sent": False, "error": str(e), "method": "greenapi"}


async def _get_admin_user() -> dict:
    """Recupera l'utente admin per accedere alle credenziali UltraMsg/Green API."""
    try:
        from database import db
        email = os.environ.get("PUBLIC_ADMIN_EMAIL", "melitobruno@gmail.com")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            user = await db.users.find_one({}, {"_id": 0})
        return user or {}
    except Exception:
        return {}


async def send_automatic_message(
    phone: str,
    template_name: str = None,
    template_vars: list = None,
    fallback_text: str = None,
    user: dict = None,
    lang: str = "it"
) -> dict:
    """
    Invio messaggi automatici con fallback chain robusta:
      1. Meta Cloud API template (se template_name fornito e WA_TOKEN attivo)
      2. UltraMsg (testo libero — no restrizione 24h)
      3. Green API (testo libero — no restrizione 24h)
      4. Cloud API testo libero (ultima ratio, funziona solo entro 24h)

    Params:
      - template_name: nome template Meta (se approvato, viene tentato per primo)
      - template_vars: lista variabili per il template
      - fallback_text: testo per UltraMsg/Green API se template fallisce
      - user: documento utente con credenziali ultramsg/green (se None viene recuperato)
    """
    if not phone:
        return {"sent": False, "error": "phone mancante"}

    last_error = None

    # 1. Meta Cloud API template
    if template_name and WA_TOKEN:
        result = await send_whatsapp_template(phone, template_name, template_vars or [], lang=lang)
        if result.get("sent"):
            return result
        last_error = result.get("error")
        logger.warning(f"[WA AUTO] Template '{template_name}' fallito ({last_error}) → tentativo fallback")

    # Se non c'è testo di fallback, non possiamo proseguire
    if not fallback_text:
        return {"sent": False, "error": last_error or "Template e fallback_text mancanti", "method": "none"}

    # Recupera user se non passato (per credenziali UltraMsg/Green API)
    if not user:
        user = await _get_admin_user()

    # 2. UltraMsg
    result = await _send_ultramsg(phone, fallback_text, user)
    if result.get("sent"):
        return result
    logger.warning(f"[WA AUTO] UltraMsg fallito: {result.get('error')}")

    # 3. Green API
    result = await _send_greenapi(phone, fallback_text, user)
    if result.get("sent"):
        return result
    logger.warning(f"[WA AUTO] Green API fallito: {result.get('error')}")

    # 4. Ultima ratio: Cloud API testo libero (funziona solo entro 24h da ultimo msg ricevuto)
    result = await send_whatsapp_cloud(phone, fallback_text + WA_FOOTER)
    if result.get("sent"):
        return result

    return {"sent": False, "error": "Tutti i provider hanno fallito", "last_error": last_error, "method": "none"}


async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    """Invio messaggio libero con fallback chain (Cloud → UltraMsg → Green API).

    Routing intelligente: se il messaggio è un promemoria o conferma riconoscibile,
    usa il template Meta approvato. Altrimenti usa il testo libero (con fallback)."""
    m_lower = message.lower()

    # Riconosce promemoria dell'agenda
    if "appuntamento" in m_lower or "ti ricordiamo" in m_lower or "domani alle" in m_lower:
        ora = re.search(r'(\d{2}:\d{2})', message)
        ora_str = ora.group(1) if ora else "da concordare"
        data_str = "domani"
        data_match = re.search(r'(\d{2}/\d{2}/\d{4})', message)
        if data_match: data_str = data_match.group(1)
        return await send_automatic_message(
            phone,
            template_name="promemoria_bruno_melito_hair_it",
            template_vars=[data_str, ora_str],
            fallback_text=message,
            user=user,
        )

    # Riconosce conferme prenotazione (sia "confermato" che "confermata")
    if "confermat" in m_lower and "prenotazione" in m_lower:
        data = re.search(r'(\d{2}/\d{2}/\d{4})', message)
        ora = re.search(r'(\d{2}:\d{2})', message)
        return await send_automatic_message(
            phone,
            template_name="promemoria_bruno_melito_hair_it",
            template_vars=[data.group(1) if data else "prossimamente", ora.group(1) if ora else ""],
            fallback_text=message,
            user=user,
        )

    # Testo libero generico: Cloud API → UltraMsg → Green API
    return await send_automatic_message(
        phone,
        template_name=None,
        fallback_text=message,
        user=user,
    )

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
