# Project Changelog — Bruno Melito Hair

## 2026-07-03

### Sessione: Audit sicurezza + fix WhatsApp template

**Commit `144ffa9`** — fix: fallback a testo libero quando template Meta (#132001) non esiste
- `backend/utils.py` → `send_automatic_message()`: se il template Meta fallisce con #132001 (not found) e `fallback_text` è presente, l'esecuzione prosegue al testo libero invece di restituire errore immediato

**Commit `5116c79`** — Audit Fase 3: rate limit, VAPID PEM, admin email, delete debug scripts
- `backend/routes/auth.py` → rate limiting unificato in unica funzione `_check_rate_limit()` (era duplicata per login e register)
- `backend/routes/push.py` → VAPID PEM costruzione estratta in `_build_vapid_pem()` (era ripetuta 2 volte)
- `backend/routes/blocked_slots.py` → email admin hardcoded sostituita con `PUBLIC_ADMIN_EMAIL` env var + helper `_get_salon_owner()`
- `backend/debug_social.py` → ELIMINATO (script debug non usato)
- `backend/test_login_debug.py` → ELIMINATO (conteneva password MongoDB in chiaro)

**Sicurezza**
- Password MongoDB `brunomongo` esposta in `test_login_debug.py` (ora eliminato) → cambiata su Atlas + `MONGO_URL` aggiornata su Render ✅
