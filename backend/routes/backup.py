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
BACKUP_ROTATE_DAYS = int(os.environ.get("BACKUP_ROTATE_DAYS", "7"))


def _rotate_backups():
    """Mantiene gli ultimi BACKUP_ROTATE_DAYS backup giornalieri, elimina i più vecchi."""
    try:
        files = sorted([
            f for f in os.listdir(_BACKUP_DIR)
            if f.startswith("salon_backup_") and f.endswith(".json")
        ])
        while len(files) >= BACKUP_ROTATE_DAYS:
            oldest = os.path.join(_BACKUP_DIR, files.pop(0))
            os.remove(oldest)
            logger.info(f"Backup vecchio rimosso: {oldest}")
    except Exception as e:
        logger.warning(f"Rotazione backup fallita: {e}")


async def run_backup() -> bool:
    """
    Esegue il backup completo di tutti i dati del salone.
    Mantiene un file per data (rotante, max BACKUP_ROTATE_DAYS giorni).
    Aggiorna sempre anche salon_backup.json come file "ultimo backup" per il download rapido.
    """
    try:
        logger.info("Backup serale avviato...")

        (
            appointments, clients, payments, expenses, cards, card_templates,
            loyalty, loyalty_rewards, operators, services, promotions,
            blocked_slots, sospesi, users,
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
            "users": users,
        }

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        dated_file = os.path.join(_BACKUP_DIR, f"salon_backup_{today_str}.json")

        # Scrittura atomica su file datato
        tmp_file = dated_file + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
        os.replace(tmp_file, dated_file)

        # Copia anche su salon_backup.json (per compatibilità con il download rapido)
        import shutil
        shutil.copy2(dated_file, BACKUP_FILE)

        # Elimina backup più vecchi di BACKUP_ROTATE_DAYS
        _rotate_backups()

        total_records = sum(len(v) for v in backup_data.values() if isinstance(v, list))
        logger.info(
            f"Backup completato [{today_str}]: {total_records} record — "
            f"appointments={len(appointments)}, clients={len(clients)}, "
            f"payments={len(payments)}, services={len(services)}"
        )
        return True

    except Exception as e:
        logger.error(f"Errore durante il backup: {e}", exc_info=True)
        try:
            os.remove(dated_file + ".tmp")
        except Exception:
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

    # Lista tutti i backup giornalieri disponibili
    available = []
    try:
        for fname in sorted(os.listdir(_BACKUP_DIR), reverse=True):
            if fname.startswith("salon_backup_") and fname.endswith(".json"):
                fpath = os.path.join(_BACKUP_DIR, fname)
                fstat = os.stat(fpath)
                date_part = fname.replace("salon_backup_", "").replace(".json", "")
                available.append({
                    "date": date_part,
                    "filename": fname,
                    "size_kb": round(fstat.st_size / 1024, 1),
                })
    except Exception:
        pass

    return {
        "exists": True,
        "size_kb": round(stat.st_size / 1024, 1),
        "last_modified": last_modified,
        "backup_date": backup_date,
        "rotate_days": BACKUP_ROTATE_DAYS,
        "available_backups": available,
    }


@router.get("/backup/download/{date}")
async def download_backup_by_date(date: str, current_user: dict = Depends(get_current_user)):
    """Scarica il backup di una data specifica (formato YYYY-MM-DD)."""
    import re as _re
    if not _re.match(r'^\d{4}-\d{2}-\d{2}$', date):
        raise HTTPException(status_code=400, detail="Formato data non valido (YYYY-MM-DD)")
    fpath = os.path.join(_BACKUP_DIR, f"salon_backup_{date}.json")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail=f"Nessun backup disponibile per {date}")
    return FileResponse(fpath, media_type="application/json", filename=f"salon_backup_{date}.json")


@router.get("/backup/download-pdf")
async def download_backup_pdf(current_user: dict = Depends(get_current_user)):
    """Genera e scarica un PDF con il riepilogo completo dei dati del salone."""
    from fpdf import FPDF

    (
        appointments, clients, payments, expenses, cards, card_templates,
        loyalty, loyalty_rewards, operators, services, promotions,
        blocked_slots, sospesi, users,
    ) = await _collect_all()

    # Filtra per utente corrente
    uid = current_user["id"]
    clients_u     = [c for c in clients if c.get("user_id") == uid]
    services_u    = [s for s in services if s.get("user_id") == uid]
    operators_u   = [o for o in operators if o.get("user_id") == uid]
    appointments_u = [a for a in appointments if a.get("user_id") == uid]
    payments_u    = [p for p in payments if p.get("user_id") == uid]
    expenses_u    = [e for e in expenses if e.get("user_id") == uid]
    cards_u       = [c for c in cards if c.get("user_id") == uid]

    today = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    salon = current_user.get("salon_name", "Salone")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Intestazione ─────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, salon, ln=True, align="C")
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 7, f"Backup dati — {today}", ln=True, align="C")
    pdf.ln(6)

    def section(title):
        pdf.set_fill_color(200, 97, 122)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, f"  {title}", ln=True, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "", 10)
        pdf.ln(2)

    def row(label, value):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 6, label, ln=False)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, str(value), ln=True)

    def table_header(*cols_widths):
        pdf.set_fill_color(240, 230, 220)
        pdf.set_font("Helvetica", "B", 9)
        for col, w in cols_widths:
            pdf.cell(w, 6, col, border=1, fill=True)
        pdf.ln()
        pdf.set_font("Helvetica", "", 9)

    def safe(v, max_len=35):
        return str(v or "")[:max_len]

    # ── Riepilogo ─────────────────────────────────────────────────────────────
    section("Riepilogo")
    totale_incassi = sum(p.get("total_paid", 0) for p in payments_u)
    totale_spese   = sum(e.get("amount", 0) for e in expenses_u)
    row("Clienti", len(clients_u))
    row("Operatori", len(operators_u))
    row("Servizi", len(services_u))
    row("Appuntamenti totali", len(appointments_u))
    row("Pagamenti registrati", len(payments_u))
    row("Totale incassato", f"EUR {totale_incassi:.2f}")
    row("Totale spese", f"EUR {totale_spese:.2f}")
    row("Utile netto", f"EUR {totale_incassi - totale_spese:.2f}")
    row("Carte prepagate attive", len([c for c in cards_u if c.get("active")]))
    pdf.ln(4)

    # ── Clienti ───────────────────────────────────────────────────────────────
    section(f"Clienti ({len(clients_u)})")
    table_header(("Nome", 65), ("Telefono", 40), ("Email", 55), ("Visite", 20))
    for c in sorted(clients_u, key=lambda x: x.get("name", "")):
        pdf.cell(65, 5, safe(c.get("name")), border=1)
        pdf.cell(40, 5, safe(c.get("phone")), border=1)
        pdf.cell(55, 5, safe(c.get("email")), border=1)
        pdf.cell(20, 5, str(c.get("total_visits", 0)), border=1)
        pdf.ln()
    pdf.ln(4)

    # ── Servizi ───────────────────────────────────────────────────────────────
    section(f"Servizi ({len(services_u)})")
    table_header(("Nome", 80), ("Categoria", 40), ("Durata (min)", 30), ("Prezzo EUR", 30))
    for s in sorted(services_u, key=lambda x: x.get("name", "")):
        pdf.cell(80, 5, safe(s.get("name")), border=1)
        pdf.cell(40, 5, safe(s.get("category")), border=1)
        pdf.cell(30, 5, str(s.get("duration", "")), border=1)
        pdf.cell(30, 5, f"{s.get('price', 0):.2f}", border=1)
        pdf.ln()
    pdf.ln(4)

    # ── Operatori ─────────────────────────────────────────────────────────────
    section(f"Operatori ({len(operators_u)})")
    table_header(("Nome", 80), ("Telefono", 50), ("Attivo", 20))
    for o in operators_u:
        pdf.cell(80, 5, safe(o.get("name")), border=1)
        pdf.cell(50, 5, safe(o.get("phone")), border=1)
        pdf.cell(20, 5, "Si" if o.get("active") else "No", border=1)
        pdf.ln()
    pdf.ln(4)

    # ── Ultimi 100 appuntamenti ───────────────────────────────────────────────
    sorted_apts = sorted(appointments_u, key=lambda x: (x.get("date",""), x.get("time","")), reverse=True)[:100]
    section(f"Ultimi appuntamenti (max 100 su {len(appointments_u)})")
    table_header(("Data", 22), ("Ora", 16), ("Cliente", 50), ("Servizi", 60), ("Stato", 22), ("EUR", 20))
    for a in sorted_apts:
        svcs = ", ".join(s.get("name","") for s in (a.get("services") or []))
        pdf.cell(22, 5, safe(a.get("date", "")), border=1)
        pdf.cell(16, 5, safe(a.get("time", "")), border=1)
        pdf.cell(50, 5, safe(a.get("client_name", ""), 28), border=1)
        pdf.cell(60, 5, safe(svcs, 38), border=1)
        pdf.cell(22, 5, safe(a.get("status", ""), 12), border=1)
        pdf.cell(20, 5, f"{a.get('total_price', 0):.2f}", border=1)
        pdf.ln()
    pdf.ln(4)

    # ── Carte prepagate ───────────────────────────────────────────────────────
    if cards_u:
        section(f"Carte prepagate ({len(cards_u)})")
        table_header(("Cliente", 55), ("Nome carta", 50), ("Residuo EUR", 30), ("Attiva", 20), ("Scadenza", 35))
        for c in cards_u:
            pdf.cell(55, 5, safe(c.get("client_name")), border=1)
            pdf.cell(50, 5, safe(c.get("name")), border=1)
            pdf.cell(30, 5, f"{c.get('remaining_value', 0):.2f}", border=1)
            pdf.cell(20, 5, "Si" if c.get("active") else "No", border=1)
            pdf.cell(35, 5, safe(c.get("valid_until", "N/D")), border=1)
            pdf.ln()
        pdf.ln(4)

    # ── Salva in memoria e restituisci ────────────────────────────────────────
    import io
    buf = io.BytesIO(pdf.output())
    filename = f"backup_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.pdf"
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
