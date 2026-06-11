import os
import asyncio
import requests as _req
import re
import uuid as _uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# --- CONFIGURAZIONI TWILIO (Legacy support) ---
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')
twilio_client = None


# --- CONFIGURAZIONI WHATSAPP CLOUD API ---
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '1030164126858033')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')
WA_FOOTER = "\n\nMessaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526. Grazie!"

def normalize_phone_wa(phone: str) -> str:
    """Restituisce il numero in formato 393XXXXXXXXX."""
    if not phone: return ""
    d = re.sub(r'\D', '', str(phone))
    if d.startswith('0039'): d = d[4:]
    elif d.startswith('39') and len(d) > 10: d = d[2:]
    if not d.startswith('39') and len(d) >= 9: d = '39' + d
    return d

async def _log_communication(user_id: str, channel: str, phone: str, message: str, result: dict):
    """Registra l'esito della comunicazione nel database per lo storico/audit."""
    try:
        from database import db
        log_entry = {
            "id": str(_uuid.uuid4()),
            "user_id": user_id,
            "channel": channel,
            "phone": phone,
            "message": message[:1000],
            "sent": result.get("sent", False),
            "method": result.get("method", "unknown"),
            "error": result.get("error"),
            "provider_response": str(result.get("data", ""))[:500],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.communication_logs.insert_one(log_entry)
        # Anche nello storico vecchio per compatibilità
        await db.reminders_sent.insert_one({
            "id": log_entry["id"], "user_id": user_id, "type": "automatico",
            "client_phone": phone, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "status": "sent" if log_entry["sent"] else "failed", "sent_at": log_entry["timestamp"]
        })
    except Exception as e:
        logger.error(f"Errore logging comunicazione: {e}")

async def send_whatsapp_template(phone: str, template_name: str, variables: list = None, lang: str = "it") -> dict:
    if not WA_TOKEN: return {"sent": False, "error": "Token Meta non configurato"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    payload = {
        "messaging_product": "whatsapp", "to": phone_clean, "type": "template",
        "template": {
            "name": template_name, "language": {"code": lang},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in (variables or [])]}]
        }
    }
    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        rjson = resp.json()
        if resp.status_code == 200:
            return {"sent": True, "method": "meta_template", "data": rjson}
        
        # Fallback it_IT se it fallisce
        if lang == "it" and (resp.status_code == 400 or resp.status_code == 404):
            return await send_whatsapp_template(phone, template_name, variables, lang="it_IT")
            
        return {"sent": False, "error": rjson.get("error", {}).get("message", "Errore API"), "code": resp.status_code, "data": rjson}
    except Exception as e:
        return {"sent": False, "error": str(e)}

async def send_whatsapp_cloud(phone: str, message: str) -> dict:
    if not WA_TOKEN: return {"sent": False, "error": "Token mancante"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {"messaging_product": "whatsapp", "to": phone_clean, "type": "text", "text": {"body": message}}
    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        return {"sent": resp.status_code == 200, "method": "meta_text", "data": resp.json()}
    except Exception as e:
        return {"sent": False, "error": str(e)}

async def _send_ultramsg(phone: str, message: str, user: dict) -> dict:
    instance_id = (user or {}).get("ultramsg_instance_id")
    token = (user or {}).get("ultramsg_token")
    if not instance_id or not token: return {"sent": False, "error": "UltraMsg non configurato"}
    try:
        url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
        resp = await asyncio.to_thread(_req.post, url, data={"token": token, "to": normalize_phone_wa(phone) + "@c.us", "body": message}, timeout=15)
        rjson = resp.json()
        return {"sent": rjson.get("sent") == "true" or rjson.get("sent") == True, "method": "ultramsg", "data": rjson}
    except Exception as e: return {"sent": False, "error": str(e)}

async def _send_greenapi(phone: str, message: str, user: dict) -> dict:
    id_instance = (user or {}).get("green_api_instance_id")
    api_token = (user or {}).get("green_api_token")
    if not id_instance or not api_token: return {"sent": False, "error": "Green API non configurata"}
    try:
        url = f"https://api.greenapi.com/waInstance{id_instance}/sendMessage/{api_token}"
        resp = await asyncio.to_thread(_req.post, url, json={"chatId": normalize_phone_wa(phone) + "@c.us", "message": message}, timeout=15)
        rjson = resp.json()
        return {"sent": bool(rjson.get("idMessage")), "method": "greenapi", "data": rjson}
    except Exception as e: return {"sent": False, "error": str(e)}

async def send_automatic_message(phone: str, template_name: str = None, template_vars: list = None, fallback_text: str = None, user: dict = None) -> dict:
    """Funzione maestra con catena di fallback e logging obbligatorio."""
    if not phone: return {"sent": False, "error": "Telefono mancante"}
    
    res = {"sent": False, "method": "none", "error": "Inizio invio"}
    
    # 1. Meta Template (Primo tentativo se fornito)
    if template_name and WA_TOKEN:
        res = await send_whatsapp_template(phone, template_name, template_vars)
        if res.get("sent"): 
            await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, f"Template: {template_name}", res)
            return res
        logger.warning(f"Meta Template {template_name} fallito: {res.get('error')}")

    # Se arriviamo qui, il template ha fallito o non è stato fornito. Serve il testo libero.
    msg = fallback_text or (f"Ciao! Ti scriviamo da Bruno Melito Hair. Per info: 3397833526." if not template_name else "")
    if not msg: return res

    # 2. UltraMsg (Ottimo per testo libero senza limiti 24h)
    res_ultra = await _send_ultramsg(phone, msg, user)
    if res_ultra.get("sent"):
        await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, msg, res_ultra)
        return res_ultra

    # 3. Green API (Alternativa a UltraMsg)
    res_green = await _send_greenapi(phone, msg, user)
    if res_green.get("sent"):
        await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, msg, res_green)
        return res_green

    # 4. Meta Text (Ultimo tentativo, funziona solo se cliente ha scritto nelle ultime 24h)
    res_meta = await send_whatsapp_cloud(phone, msg + WA_FOOTER)
    await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, msg, res_meta)
    return res_meta

async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    """Interfaccia semplificata per invio manuale o da pulsanti."""
    m_lower = message.lower()
    # Rilevamento automatico template per ottimizzare invio
    if "appuntamento" in m_lower or "ricordiamo" in m_lower:
        # Estrai dati base se possibile
        nome = re.search(r'Ciao\s+([^!,\n]+)', message)
        nome = nome.group(1).strip() if nome else "Cliente"
        ora = re.search(r'(\d{2}:\d{2})', message)
        ora = ora.group(1) if ora else "10:00"
        return await send_automatic_message(phone, "promemoria_appuntamento", [nome, "domani", ora], message, user)
    
    if "grazie" in m_lower or "visita" in m_lower:
        nome = re.search(r'Ciao\s+([^!,\n]+)', message)
        nome = nome.group(1).strip() if nome else "Cliente"
        link = "https://maps.app.goo.gl/8FdnYpnNyQcd78LQ7"
        return await send_automatic_message(phone, "ringraziamento_visita", [nome, link], message, user)

    return await send_automatic_message(phone, None, None, message, user)

def visit_done_filter(today_str: str) -> dict:
    """Filtro Mongo: un appuntamento conta come VISITA EFFETTUATA se non è
    cancellato e o è già 'completed' (cassa fatta) o la sua data è passata
    (effettuato ma senza checkout). Unifica storico cliente, richiami inattivi
    e richiamo colore così concordano tutti sulla stessa definizione."""
    return {
        "status": {"$ne": "cancelled"},
        "$or": [{"status": "completed"}, {"date": {"$lte": today_str}}],
    }


def visit_is_done(apt: dict, today_str: str) -> bool:
    """Versione in-memory di visit_done_filter (per cicli su liste già caricate)."""
    if apt.get("status") == "cancelled":
        return False
    return apt.get("status") == "completed" or (apt.get("date", "") <= today_str)


def calculate_end_time(start_time: str, duration: int) -> str:
    try:
        h, m = map(int, start_time.split(':'))
        total = h * 60 + m + duration
        return f"{(total // 60) % 24:02d}:{total % 60:02d}"
    except: return start_time

def send_sms_reminder(p, m, s): return {"success": False, "error": "SMS disabilitati pro-WhatsApp"}
