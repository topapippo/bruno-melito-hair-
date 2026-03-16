import os


def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    hours, minutes = map(int, start_time.split(':'))
    total_minutes = hours * 60 + minutes + duration_minutes
    end_hours = (total_minutes // 60) % 24
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


def format_phone_whatsapp(phone: str) -> str:
    """Format phone for WhatsApp wa.me links (no + prefix, just digits)."""
    p = ''.join(filter(str.isdigit, phone))
    if not p.startswith('39') and p.startswith('3') and len(p) == 10:
        p = '39' + p
    return p
