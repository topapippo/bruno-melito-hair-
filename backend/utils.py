import os

# Twilio Config (optional)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# WhatsApp Cloud API (Meta ufficiale)
WA_PHONE_NUMBER_ID = os.environ.get('WHATSAPP_PHONE_ID', '1074010595799970')
WA_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')

WA_FOOTER = "\n\nQuesto è un messaggio automatico di cortesia di Bruno Melito Hair. Se hai bisogno di scriverci, rispondi al 3397833526. Grazie!"

print(f"[STARTUP] ID WHATSAPP ATTUALE: {WA_PHONE_NUMBER_ID}", flush=True)
print(f"[STARTUP] WHATSAPP_TOKEN configurato: {'SI' if WA_TOKEN else 'NO'}", flush=True)

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except ImportError:
        pass


def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    hours, minutes = map(int, start_time.split(':'))
    total_minutes = hours * 60 + minutes + duration_minutes
    # Cap a 23:59 se supera la mezzanotte invece di riportare a 00:xx
    if total_minutes >= 24 * 60:
        return "23:59"
    end_hours = total_minutes // 60
    end_minutes = total_minutes % 60
    return f"{end_hours:02d}:{end_minutes:02d}"


def normalize_phone_wa(phone: str) -> str:
    """Restituisce il numero in formato 393XXXXXXXXX (prefisso 39 italiano)."""
    import re
    d = re.sub(r'\D', '', phone)
    if d.startswith('0039'):
        d = d[4:]
    elif d.startswith('39') and len(d) > 10:
        d = d[2:]
    return '39' + d


async def send_whatsapp_cloud(phone: str, message: str) -> dict:
    """Invia WhatsApp via Meta Cloud API ufficiale (graph.facebook.com v21.0)."""
    import asyncio
    import requests as _req

    if not WA_TOKEN:
        return {"sent": False, "method": "cloud_api", "error": "WHATSAPP_TOKEN non configurato"}

    phone_clean = normalize_phone_wa(phone)  # es. 393XXXXXXXXX
    print(f"[WA SEND] ID WHATSAPP ATTUALE: {WA_PHONE_NUMBER_ID} → {phone_clean}", flush=True)

    try:
        url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WA_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_clean,
            "type": "text",
            "text": {"body": message},
        }
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        rjson = {}
        try:
            rjson = resp.json()
        except Exception:
            pass

        if resp.status_code == 200 and rjson.get("messages"):
            return {"sent": True, "method": "cloud_api",
                    "message_id": rjson["messages"][0].get("id", "")}

        error = rjson.get("error", {})
        return {
            "sent": False, "method": "cloud_api",
            "error": error.get("message") or resp.text[:200],
            "code": error.get("code"),
        }
    except Exception as e:
        return {"sent": False, "method": "cloud_api", "error": str(e)}


async def send_whatsapp_template(phone: str, template_name: str, language_code: str = "en_US", components: list = None) -> dict:
    """Invia un template WhatsApp via Meta Cloud API. Richiede template approvato lato Meta.
    `hello_world` è disponibile di default in `en_US`.
    `components` opzionale per template con variabili (es. body parameters).
    """
    import asyncio
    import requests as _req

    if not WA_TOKEN:
        return {"sent": False, "method": "cloud_api_template", "error": "WHATSAPP_TOKEN non configurato"}

    phone_clean = normalize_phone_wa(phone)
    print(f"[WA TEMPLATE] {template_name}/{language_code} → {phone_clean}", flush=True)

    try:
        url = f"https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WA_TOKEN}",
            "Content-Type": "application/json",
        }
        template_obj = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if components:
            template_obj["components"] = components
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_clean,
            "type": "template",
            "template": template_obj,
        }
        resp = await asyncio.to_thread(_req.post, url, headers=headers, json=payload, timeout=15)
        rjson = {}
        try:
            rjson = resp.json()
        except Exception:
            pass

        if resp.status_code == 200 and rjson.get("messages"):
            return {"sent": True, "method": "cloud_api_template",
                    "message_id": rjson["messages"][0].get("id", "")}

        error = rjson.get("error", {})
        return {
            "sent": False, "method": "cloud_api_template",
            "error": error.get("message") or resp.text[:300],
            "code": error.get("code"),
            "details": error.get("error_data") or error.get("error_user_msg"),
        }
    except Exception as e:
        return {"sent": False, "method": "cloud_api_template", "error": str(e)}


def format_phone_e164(phone: str) -> str:
    phone = ''.join(filter(str.isdigit, phone))
    if phone.startswith('39'):
        return f"+{phone}"
    elif phone.startswith('3') and len(phone) == 10:
        return f"+39{phone}"
    elif not phone.startswith('+'):
        return f"+39{phone}"
    return phone


async def _log_communication(user_id: str, channel: str, phone: str, message: str, result: dict):
    """Salva ogni invio (riuscito o fallito) in db.communication_logs. Non-blocking, swallow errors."""
    try:
        from database import db
        from datetime import datetime, timezone
        import uuid as _uuid
        await db.communication_logs.insert_one({
            "id": str(_uuid.uuid4()),
            "user_id": user_id or "",
            "channel": channel,
            "phone": phone,
            "message": (message or "")[:500],
            "sent": bool(result.get("sent")),
            "method": result.get("method", ""),
            "message_id": result.get("message_id", ""),
            "error": result.get("error", ""),
            "code": result.get("code", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass  # logging non deve mai bloccare l'invio


async def send_whatsapp(phone: str, message: str, user: dict) -> dict:
    """Invia WhatsApp via Cloud API (Meta ufficiale, PRIMARIO) → UltraMsg → Green API (fallback legacy).
    Ogni esito viene loggato in db.communication_logs.
    """
    import asyncio
    import requests as _req

    message = message + WA_FOOTER
    user_id = (user or {}).get("id", "")
    final_result = None

    # --- 1. WhatsApp Cloud API ufficiale Meta (PROVIDER PRIMARIO) ---
    if WA_TOKEN:
        result = await send_whatsapp_cloud(phone, message)
        if result.get("sent"):
            await _log_communication(user_id, "whatsapp", phone, message, result)
            return result
        final_result = result  # tieni l'ultimo errore se i fallback falliscono

    phone_clean = normalize_phone_wa(phone)
    wa_number = phone_clean + "@c.us"

    # --- 2. UltraMsg (legacy fallback) ---
    um_instance = user.get("ultramsg_instance_id", "")
    um_token = user.get("ultramsg_token", "")
    if um_instance and um_token:
        try:
            url = f"https://api.ultramsg.com/{um_instance}/messages/chat"
            resp = await asyncio.to_thread(
                _req.post, url,
                data={"token": um_token, "to": wa_number, "body": message},
                timeout=15
            )
            rjson = {}
            try:
                rjson = resp.json()
            except Exception:
                pass
            if resp.status_code == 200 and str(rjson.get("sent", "")).lower() == "true":
                ok = {"sent": True, "method": "ultramsg"}
                await _log_communication(user_id, "whatsapp", phone, message, ok)
                return ok
            final_result = {"sent": False, "method": "ultramsg", "error": rjson.get("error", resp.text[:200])}
        except Exception as e:
            final_result = {"sent": False, "method": "ultramsg", "error": str(e)}

    # --- 3. Green API (legacy fallback) ---
    instance_id = user.get("green_api_instance_id", "")
    api_token = user.get("green_api_token", "")
    if instance_id and api_token:
        try:
            url = f"https://api.greenapi.com/waInstance{instance_id}/sendMessage/{api_token}"
            resp = await asyncio.to_thread(
                _req.post, url,
                json={"chatId": wa_number, "message": message},
                timeout=15
            )
            rjson = {}
            try:
                rjson = resp.json()
            except Exception:
                pass
            if resp.status_code == 200 and rjson.get("idMessage"):
                ok = {"sent": True, "method": "greenapi"}
                await _log_communication(user_id, "whatsapp", phone, message, ok)
                return ok
            final_result = {"sent": False, "method": "greenapi", "error": rjson.get("error", resp.text[:200])}
        except Exception as e:
            final_result = {"sent": False, "method": "greenapi", "error": str(e)}

    fail = final_result or {"sent": False, "method": "none", "error": "Nessun provider configurato"}
    await _log_communication(user_id, "whatsapp", phone, message, fail)
    return fail


async def send_sms_reminder(phone: str, message: str, salon_name: str) -> dict:
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        return {"success": False, "error": "Twilio non configurato"}

    try:
        formatted_phone = format_phone_e164(phone)
        sms = twilio_client.messages.create(
            body=f"[{salon_name}] {message}",
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        return {"success": True, "sid": sms.sid}
    except Exception as e:
        return {"success": False, "error": str(e)}
