import json
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from database import db
from auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Directory e file di backup (file unico, sovrascrive ogni volta) ─────────────
_BACKUP_DIR = "/app/backend/backups"
try:
    os.makedirs(_BACKUP_DIR, exist_ok=True)
except (PermissionError, OSError):
    _BACKUP_DIR = "/tmp/salon_backups"
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
