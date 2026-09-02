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
# Rimosso il fallback hardcoded per sicurezza
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')
WA_FOOTER = "\n\nMessaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al salone. Grazie!"

def normalize_phone_wa(phone: str) -> str:
    """Restituisce il numero in formato 393XXXXXXXXX."""
    if not phone: return ""
    d = re.sub(r'\D', '', str(phone))
    if d.startswith('0039'): d = d[4:]
    elif d.startswith('39') and len(d) > 10: d = d[2:]
    if not d.startswith('39') and len(d) >= 9: d = '39' + d
    return d

async def _log_communication(user_id: str, channel: str, phone: str, message: str, result: dict):
    """Registra l'esito della comunicazione nel database per lo storico/audit.
    Salva anche l'id messaggio di Meta (wa_message_id): serve al webhook per
    aggiornare questo stesso record quando arriva lo stato di consegna reale
    (delivered/read/failed) — prima veniva registrato solo l'accettazione
    iniziale (HTTP 200), non se il messaggio fosse arrivato davvero."""
    try:
        from database import db
        data = result.get("data") or {}
        wa_message_id = None
        if isinstance(data, dict):
            msgs = data.get("messages") or []
            if msgs and isinstance(msgs[0], dict):
                wa_message_id = msgs[0].get("id")
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
            "wa_message_id": wa_message_id,
            "delivery_status": "accepted" if result.get("sent") else None,
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

async def send_whatsapp_template(phone: str, template_name: str, variables: list = None, lang: str = "it", button_param: str = None) -> dict:
    if not WA_TOKEN: return {"sent": False, "error": "Token Meta non configurato"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    components = []
    if variables:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(v)} for v in variables]
        })
    
    # Pulsante URL Dinamico (fondamentale per la ricevuta)
    if button_param:
        components.append({
            "type": "button",
            "sub_type": "url",
            "index": 0,
            "parameters": [{"type": "text", "text": button_param}]
        })

    payload = {
        "messaging_product": "whatsapp", "to": phone_clean, "type": "template",
        "template": {
            "name": template_name, "language": {"code": lang},
            "components": components
        }
    }
    try:
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        rjson = resp.json()
        if resp.status_code == 200:
            return {"sent": True, "method": "meta_template", "data": rjson}
        
        # Fallback it_IT se it fallisce
        if lang == "it" and (resp.status_code == 400 or resp.status_code == 404):
            return await send_whatsapp_template(phone, template_name, variables, lang="it_IT", button_param=button_param)
            
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
        rstr = str(rjson)
        quota_indicators = ["quota", "whitelist", "esauri", "esaurita", "Quota mensile"]
        if any(ind.lower() in rstr.lower() for ind in quota_indicators):
            return {"sent": False, "method": "greenapi", "data": rjson, "error": rstr, "quota_exhausted": True}
        return {"sent": bool(rjson.get("idMessage")), "method": "greenapi", "data": rjson}
    except Exception as e: return {"sent": False, "error": str(e)}

async def _send_twilio_sms(phone: str, message: str) -> dict:
    """Fallback SMS via Twilio REST API se configurato."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        return {"sent": False, "error": "Twilio non configurato"}
    try:
        to = normalize_phone_wa(phone)
        if not to.startswith('+'):
            to = '+' + to
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = {"From": TWILIO_PHONE_NUMBER, "To": to, "Body": message}
        resp = await asyncio.to_thread(_req.post, url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=15)
        rjson = resp.json()
        sent = resp.status_code in (200, 201)
        return {"sent": sent, "method": "twilio_sms", "data": rjson, "code": resp.status_code}
    except Exception as e:
        return {"sent": False, "error": str(e)}

async def send_automatic_message(phone: str, template_name: str = None, template_vars: list = None, fallback_text: str = None, user: dict = None, button_param: str = None) -> dict:
    """Invia via Meta Cloud API: se c'è un template lo usa e basta (NIENTE fallback
    a testo libero se fallisce). Fuori dalla finestra 24h del cliente, il testo libero
    risponde HTTP 200 senza consegnare davvero: è un falso positivo che faceva risultare
    "inviato" nei log un messaggio mai arrivato. Stessa scelta già fatta in send-direct."""
    if not phone: return {"sent": False, "error": "Telefono mancante"}
    if not WA_TOKEN: return {"sent": False, "error": "WHATSAPP_TOKEN non configurato"}

    # 1. Meta Template (nessun fallback silenzioso: un fallimento onesto è meglio
    # di un "inviato" che poi non arriva)
    if template_name:
        res = await send_whatsapp_template(phone, template_name, template_vars, button_param=button_param)
        await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, f"Template: {template_name}", res)
        if not res.get("sent"):
            logger.warning(f"Meta Template {template_name} fallito: {res.get('error')}")
        return res

    # 2. Nessun template richiesto: testo libero diretto (va bene solo entro la
    # finestra 24h del cliente, es. risposta manuale a un messaggio in entrata)
    msg = fallback_text or ""
    if not msg: return {"sent": False, "error": "Nessun testo da inviare"}
    res = await send_whatsapp_cloud(phone, msg)
    await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, msg, res)
    return res

async def send_whatsapp(phone: str, message: str, user: dict = None) -> dict:
    """Invio testo libero via Meta Cloud API."""
    return await send_automatic_message(phone, None, None, message, user)

async def resolve_client(user_id: str, name: str, phone: str = "") -> tuple:
    """Trova un cliente esistente (per NOME esatto case-insensitive, poi per
    TELEFONO normalizzato come fallback) o ne crea uno nuovo. Evita i duplicati
    alla radice. Ritorna (client_id, nome_canonico, telefono_canonico)."""
    from database import db
    name = (name or "").strip()
    phone = (phone or "").strip()

    # 1. Match per nome esatto (case-insensitive)
    if name:
        existing = await db.clients.find_one(
            {"user_id": user_id, "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1, "phone": 1}
        )
        if existing:
            return existing["id"], existing.get("name") or name, existing.get("phone") or phone

    # 2. Fallback: match per telefono normalizzato (stessa persona, nome scritto diverso)
    if phone:
        norm = normalize_phone_wa(phone)
        if norm:
            # FIX OOM: Cerchiamo nel DB solo i clienti che finiscono con le stesse 9 cifre
            suffix = norm[-9:] if len(norm) >= 9 else norm
            candidate = await db.clients.find_one(
                {"user_id": user_id, "phone": {"$regex": re.escape(suffix) + "$"}},
                {"_id": 0, "id": 1, "name": 1, "phone": 1}
            )
            if candidate:
                return candidate["id"], candidate.get("name") or name, candidate.get("phone") or phone

    # 3. Nessun match → crea nuovo cliente
    cid = str(_uuid.uuid4())
    await db.clients.insert_one({
        "id": cid, "user_id": user_id, "name": name, "phone": phone,
        "total_visits": 0, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return cid, name, phone

def visit_done_filter(today_str: str) -> dict:
    """Filtro Mongo: un appuntamento conta come VISITA EFFETTUATA se non è
    cancellato e o è già 'completed' (cassa fatta) o la sua data è passata."""
    return {
        "status": {"$ne": "cancelled"},
        "$or": [{"status": "completed"}, {"date": {"$lte": today_str}}],
    }

def visit_is_done(apt: dict, today_str: str) -> bool:
    """Versione in-memory di visit_done_filter."""
    if apt.get("status") == "cancelled":
        return False
    return apt.get("status") == "completed" or (apt.get("date", "") <= today_str)

def calculate_end_time(start_time: str, duration: int) -> str:
    try:
        h, m = map(int, start_time.split(':'))
        total = h * 60 + m + duration
        return f"{(total // 60) % 24:02d}:{total % 60:02d}"
    except (ValueError, TypeError):
        return start_time