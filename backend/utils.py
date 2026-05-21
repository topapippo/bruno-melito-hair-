import os
import asyncio
import requests as _req
import re
import uuid as _uuid
from datetime import datetime, timezone

# WhatsApp Cloud API (Meta ufficiale)
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '1030164126858033')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')

WA_FOOTER = "\n\nQuesto è un messaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526. Grazie!"

print(f"[STARTUP] ID WHATSAPP ATTUALE: {WA_PHONE_NUMBER_ID}", flush=True)

def normalize_phone_wa(phone: str) -> str:
    d = re.sub(r'\D', '', phone)
    if d.startswith('0039'): d = d[4:]
    elif d.startswith('39') and len(d) > 10: d = d[2:]
    return '39' + d

async def send_whatsapp_template(phone: str, template_name: str, variables: list) -> dict:
    """Invia un template ufficiale (es. promemoria_appunta) via Meta."""
    if not WA_TOKEN: return {"sent": False, "error": "Token non configurato"}
    phone_clean = normalize_phone_wa(phone)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    
    # Mappa le variabili {{1}}, {{2}}, {{3}}
    parameters = [{"type": "text", "text": str(v)} for v in variables]
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_clean,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "it"},
            "components": [{"type": "body", "parameters": parameters}]
        }
    }
    resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
    rjson = resp.json() if resp.status_code == 200 else {"error": resp.text}
    return {"sent": resp.status_code == 200, "data": rjson}

async def send_whatsapp(phone: str, message: str, user: dict) -> dict:
    """Questa funzione ora è intelligente: se vede un promemoria, usa il template Meta."""
    # Se il messaggio contiene "Domani alle", probabilmente è un promemoria
    if "Domani alle" in message:
        # Estraiamo i dati dal testo per riempire il template {{1}}, {{2}}, {{3}}
        # Esempio testo: "Ciao Maria! Domani alle 15:30 ti aspettiamo..."
        nome = message.split('!')[0].replace('Ciao ', '').strip() or "Cliente"
        ora = re.search(r'alle (\d{2}:\d{2})', message)
        ora_str = ora.group(1) if ora else "da concordare"
        data_domani = "domani" 
        
        # Invialo come template ufficiale (promemoria_appunta)
        return await send_whatsapp_template(phone, "promemoria_appunta", [nome, data_domani, ora_str])
    
    # Per tutti gli altri messaggi, prova l'invio normale (funzionerà solo se il cliente ha risposto)
    url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WA_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "to": normalize_phone_wa(phone),
        "type": "text",
        "text": {"body": message + WA_FOOTER}
    }
    resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
    return {"sent": resp.status_code == 200, "data": resp.json() if resp.status_code == 200 else resp.text}

# --- Altre funzioni di utility (lasciate invariate per sicurezza) ---
def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    hours, minutes = map(int, start_time.split(':'))
    total_minutes = hours * 60 + minutes + duration_minutes
    if total_minutes >= 24 * 60: return "23:59"
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"

async def _log_communication(user_id: str, channel: str, phone: str, message: str, result: dict):
    try:
        from database import db
        await db.communication_logs.insert_one({
            "id": str(_uuid.uuid4()), "user_id": user_id, "channel": channel, "phone": phone,
            "message": message[:500], "sent": result.get("sent"), "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except: pass
