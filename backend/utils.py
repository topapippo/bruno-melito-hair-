import os

# Twilio Config (optional)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

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


def format_phone_e164(phone: str) -> str:
    phone = ''.join(filter(str.isdigit, phone))
    if phone.startswith('39'):
        return f"+{phone}"
    elif phone.startswith('3') and len(phone) == 10:
        return f"+39{phone}"
    elif not phone.startswith('+'):
        return f"+39{phone}"
    return phone


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
