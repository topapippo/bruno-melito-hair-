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

async def send_automatic_message(phone: str, template_name: str = None, template_vars: list = None, fallback_text: str = None, user: dict = None) -> dict:
    """Invia via Meta Cloud API: prima template (se fornito), poi testo libero."""
    if not phone: return {"sent": False, "error": "Telefono mancante"}
    if not WA_TOKEN: return {"sent": False, "error": "WHATSAPP_TOKEN non configurato"}

    # 1. Meta Template
    if template_name:
        res = await send_whatsapp_template(phone, template_name, template_vars)
        if res.get("sent"):
            await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, f"Template: {template_name}", res)
            return res
        logger.warning(f"Meta Template {template_name} fallito: {res.get('error')} — fallback testo libero")
        # Se il template non esiste/fallisce, prova fallback_text (valido entro 24h)
        if not fallback_text:
            fail = {**res, "sent": False}
            await _log_communication((user or {}).get("id", "system"), "whatsapp", phone, f"Template: {template_name}", fail)
            return fail

    # 2. Meta testo libero (funziona solo nella finestra 24h del cliente)
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
    alla radice. Ritorna (client_id, nome_canonico, telefono_canonico): in caso di
    match usa i valori del documento esistente, così storico/richiami raggruppano bene.

    NB: il nome viene prima del telefono di proposito — i familiari spesso
    condividono lo stesso numero (mamma che prenota per la figlia): col telefono
    per primo si rischierebbe di unire persone diverse."""
    from database import db
    name = (name or "").strip()
    phone = (phone or "").strip()

    # 1. Match per nome esatto (case-insensitive) — causa principale dei duplicati
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
            candidates = await db.clients.find(
                {"user_id": user_id, "phone": {"$exists": True, "$ne": ""}},
                {"_id": 0, "id": 1, "name": 1, "phone": 1}
            ).to_list(20000)
            for c in candidates:
                if normalize_phone_wa(c.get("phone", "")) == norm:
                    return c["id"], c.get("name") or name, c.get("phone") or phone

    # 3. Nessun match → crea nuovo cliente
    cid = str(_uuid.uuid4())
    await db.clients.insert_one({
        "id": cid, "user_id": user_id, "name": name, "phone": phone,
        "total_visits": 0, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return cid, name, phone


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

