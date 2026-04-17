import json
import os
import tempfile
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from database import db
from auth import get_current_user

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Directory e file di backup (file unico, sovrascrive ogni volta) ─────────────
_BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backups"))
try:
    os.makedirs(_BACKUP_DIR, exist_ok=True)
except (PermissionError, OSError):
    _BACKUP_DIR = os.path.join(tempfile.gettempdir(), "salon_backups")
    os.makedirs(_BACKUP_DIR, exist_ok=True)

BACKUP_FILE = os.path.join(_BACKUP_DIR, "salon_backup.json")


async def run_backup() -> bool:
    """
    Esegue il backup completo di tutti i dati del salone.
    Sovrascrive sempre lo stesso file (salon_backup.json).
    """
    try:
        logger.info("Backup serale avviato...")

        # Raccoglie tutti i dati in parallelo
        (
            appointments,
            clients,
            payments,
            expenses,
            cards,
            card_templates,
            loyalty,
            loyalty_rewards,
            operators,
            services,
            promotions,
            blocked_slots,
            sospesi,
            users,
        ) = await _collect_all()

        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "appointments": appointments,
            "clients": clients,
            "payments": payments,
            "expenses": expenses,
            "cards": cards,
            "card_templates": card_templates,
            "loyalty": loyalty,
            "loyalty_rewards": loyalty_rewards,
            "operators": operators,
            "services": services,
            "promotions": promotions,
            "blocked_slots": blocked_slots,
            "sospesi": sospesi,
            # utenti senza password
            "users": users,
        }

        # Scrittura atomica: scrive su file temporaneo poi rinomina per evitare
        # file corrotto in caso di interruzione durante la scrittura
        tmp_file = BACKUP_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
        os.replace(tmp_file, BACKUP_FILE)

        total_records = sum(len(v) for v in backup_data.values() if isinstance(v, list))
        logger.info(
            f"Backup completato: {total_records} record totali — "
            f"appointments={len(appointments)}, clients={len(clients)}, "
            f"payments={len(payments)}, expenses={len(expenses)}, "
            f"cards={len(cards)}, loyalty={len(loyalty)}, "
            f"operators={len(operators)}, services={len(services)}"
        )
        return True

    except Exception as e:
        logger.error(f"Errore durante il backup: {e}", exc_info=True)
        # Rimuove il file temporaneo se ancora presente
        try:
            os.remove(BACKUP_FILE + ".tmp")
        except OSError:
            pass
        return False


async def _collect_all():
    """Recupera tutti i dati dal DB in modo sequenziale."""
    appointments  = await db.appointments.find({}, {"_id": 0}).to_list(500_000)
    clients       = await db.clients.find({}, {"_id": 0}).to_list(100_000)
    payments      = await db.payments.find({}, {"_id": 0}).to_list(500_000)
    expenses      = await db.expenses.find({}, {"_id": 0}).to_list(100_000)
    cards         = await db.cards.find({}, {"_id": 0}).to_list(100_000)
    card_templates = await db.card_templates.find({}, {"_id": 0}).to_list(10_000)
    loyalty       = await db.loyalty.find({}, {"_id": 0}).to_list(100_000)
    loyalty_rewards = await db.loyalty_rewards.find({}, {"_id": 0}).to_list(10_000)
    operators     = await db.operators.find({}, {"_id": 0}).to_list(10_000)
    services      = await db.services.find({}, {"_id": 0}).to_list(10_000)
    promotions    = await db.promotions.find({}, {"_id": 0}).to_list(10_000)
    blocked_slots = await db.blocked_slots.find({}, {"_id": 0}).to_list(10_000)
    sospesi       = await db.sospesi.find({}, {"_id": 0}).to_list(100_000)
    # Utenti: escludi il campo password per sicurezza
    users         = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1_000)
    return (
        appointments, clients, payments, expenses, cards, card_templates,
        loyalty, loyalty_rewards, operators, services, promotions,
        blocked_slots, sospesi, users,
    )


# ── Endpoint API ──────────────────────────────────────────────────────────────

@router.post("/backup/run")
async def trigger_backup(current_user: dict = Depends(get_current_user)):
    """Esegue il backup manualmente (sovrascrive il precedente)."""
    success = await run_backup()
    if not success:
        raise HTTPException(status_code=500, detail="Errore durante il backup. Controlla i log.")
    stat = os.stat(BACKUP_FILE)
    return {
        "success": True,
        "file": BACKUP_FILE,
        "size_kb": round(stat.st_size / 1024, 1),
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "message": "Backup completato con successo",
    }


@router.get("/backup/download")
async def download_backup(current_user: dict = Depends(get_current_user)):
    """Scarica il file di backup corrente."""
    if not os.path.exists(BACKUP_FILE):
        raise HTTPException(
            status_code=404,
            detail="Nessun backup disponibile. Esegui prima POST /backup/run."
        )
    filename = f"salon_backup_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"
    return FileResponse(BACKUP_FILE, media_type="application/json", filename=filename)


@router.get("/backup/status")
async def backup_status(current_user: dict = Depends(get_current_user)):
    """Restituisce lo stato del backup più recente."""
    if not os.path.exists(BACKUP_FILE):
        return {"exists": False, "message": "Nessun backup disponibile"}

    stat = os.stat(BACKUP_FILE)
    last_modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

    # Legge solo il campo backup_date senza caricare tutto il file
    backup_date = None
    try:
        with open(BACKUP_FILE, "r", encoding="utf-8") as f:
            # Legge solo i primi 200 caratteri per trovare backup_date
            head = f.read(200)
            import re
            m = re.search(r'"backup_date"\s*:\s*"([^"]+)"', head)
            if m:
                backup_date = m.group(1)
    except Exception:
        pass

    return {
        "exists": True,
        "size_kb": round(stat.st_size / 1024, 1),
        "last_modified": last_modified,
        "backup_date": backup_date,
    }


@router.post("/backup/send-email")
async def send_backup_email(current_user: dict = Depends(get_current_user)):
    """Esegue il backup e lo invia via email all'indirizzo configurato nelle impostazioni."""
    if not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(status_code=503, detail="Email non configurata. Imposta SMTP_USER e SMTP_PASSWORD nelle variabili d'ambiente.")

    # Leggi email di destinazione dalle impostazioni utente
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    recipient_email = (settings or {}).get("auto_backup_email") or current_user.get("email")
    if not recipient_email:
        raise HTTPException(status_code=400, detail="Nessuna email di destinazione configurata.")

    # Esegui il backup
    success = await run_backup()
    if not success or not os.path.exists(BACKUP_FILE):
        raise HTTPException(status_code=500, detail="Errore durante la creazione del backup.")

    # Prepara l'email
    today_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    salon_name = current_user.get("salon_name", "Salone")
    filename = f"backup_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = recipient_email
    msg["Subject"] = f"Backup Automatico — {salon_name} — {today_str}"

    body = f"Ciao!\n\nIn allegato trovi il backup dei dati del salone del {today_str}.\nConserva questo file in un posto sicuro.\n\n— {salon_name}"
    msg.attach(MIMEText(body, "plain"))

    # Allegato
    with open(BACKUP_FILE, "rb") as f:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(f.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
    msg.attach(part)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, recipient_email, msg.as_string())
        logger.info(f"Backup email inviata a {recipient_email}")
        stat = os.stat(BACKUP_FILE)
        return {"success": True, "sent_to": recipient_email, "size_kb": round(stat.st_size / 1024, 1)}
    except Exception as e:
        logger.error(f"Errore invio email backup: {e}")
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")
