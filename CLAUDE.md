# Bruno Melito Hair — Istruzioni per Claude

## Progetto
Gestionale salone + sito web pubblico. Stack: React (frontend) + FastAPI (backend) + MongoDB (motor async). Deploy su Render (free tier, 512MB RAM). Repository: `https://github.com/topapippo/bruno-melito-hair-.git`, branch `main` = produzione.

## Regole operative automatiche

### Dopo ogni implementazione backend (file `.py`):
1. Esegui `/security` sui file modificati.
2. Esegui `/deploy-check` per verificare console.log e debug code.
3. Correggi eventuali problemi trovati PRIMA del commit.

### Dopo ogni implementazione frontend (file `.jsx`, `.tsx`, `.css`):
1. Esegui `/ui-check` per brand consistency e accessibilità.
2. Esegui `/deploy-check` per import inutilizzati e debug code.
3. Correggi problemi ❌ prima del commit; segnala ⚠️ all'utente.

### Prima di ogni commit/push:
- Grep `console.log` in tutti i file staged: `git diff --cached --name-only | xargs grep -l console.log 2>/dev/null`
- Se trovato: rimuovere e ri-committare.

### Dopo ogni sessione:
- Aggiorna `memory/project_changelog.md` con le modifiche della sessione.

## Tech stack — dettagli critici

### Backend
- `db` = motor async MongoDB client (importato da `database.py`)
- `to_list(N)` su istanza free 512MB: MAX 30000 per query non filtrate, MAX 5000 per query filtrate per utente
- Ogni endpoint protetto: `current_user: dict = Depends(get_current_user)`
- Ogni query MongoDB: deve filtrare per `"user_id": current_user["id"]`
- Unique index su `clients`: `(user_id, name)` — cercare SEMPRE prima di `insert_one`
- PIL (Pillow): import lazy DENTRO la funzione, non a livello modulo

### Frontend
- API base URL: `process.env.REACT_APP_BACKEND_URL` + `/api`
- Auth: token in `localStorage['token']`, gestito da `frontend/src/lib/api.js` (axios interceptor)
- Redirect 401: solo su route non pubbliche (non `/sito/*`, non `/booking`)
- Tema gestionale: CSS variables `--admin-primary`, `--admin-sidebar-bg`, ecc. definite in Layout.jsx
- Animazioni: usare `useReducedMotion()` da framer-motion

### Brand colors (gestionale e sito)
- Rose primario: `#C8617A`
- Oro accento: `#D4AF7A`
- Espresso scuro (sidebar): `#1A0A10`
- Sfondo caldo: `#FDF8F5`
- Testo scuro: `#2D1B14`
- **MAI viola** (`purple`, `#A855F7`) nel gestionale

## Skill disponibili
- `/deploy-check` — scan console.log, import, TODO, to_list pericolosi
- `/security` — audit MongoDB injection, auth, XSS, secrets
- `/review` — code review logico e performance
- `/ui-check` — brand consistency, accessibilità, responsive
- `/ui-ux-pro-max` — design system avanzato (skill installata in `.claude/skills/`)

## Memoria persistente
La memoria del progetto è in `memory/` (MEMORY.md + file collegati). Aggiornare dopo ogni sessione.
