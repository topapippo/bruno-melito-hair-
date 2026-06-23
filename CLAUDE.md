# Bruno Melito Hair — Istruzioni per Claude

## Progetto
Gestionale salone + sito web pubblico. Stack: React (frontend) + FastAPI (backend) + MongoDB (motor async). Deploy su Render (free tier, 512MB RAM). Repository: `https://github.com/topapippo/bruno-melito-hair-.git`, branch `main` = produzione.

## Regole operative automatiche

### Dopo ogni implementazione backend (file `.py`):
1. Esegui `/security` sui file modificati.
2. Esegui `/deploy-check` per verificare console.log e debug code.
3. Esegui `/perf` per query pericolose e N+1.
4. Esegui `/db-audit` per verifica user_id filter su ogni endpoint.
5. Correggi eventuali problemi trovati PRIMA del commit.

### Dopo ogni implementazione frontend (file `.jsx`, `.tsx`, `.css`):
1. Esegui `/ui-check` per brand consistency.
2. Esegui `/fix-purple` per rimuovere viola residuo.
3. Esegui `/a11y` per accessibilità (bottoni icona, input, contrasto).
4. Esegui `/deploy-check` per import inutilizzati e debug code.
5. Correggi problemi ❌ prima del commit; segnala ⚠️ all'utente.

### Prima di ogni commit/push:
- Grep `console.log` in tutti i file staged: `git diff --cached --name-only | xargs grep -l console.log 2>/dev/null`
- Se trovato: rimuovere e ri-committare.

### Inizio sessione:
- Esegui `/status` per vedere file modificati, ultimi commit e TODOs aperti.

### Dopo ogni sessione:
- Esegui `/changelog-gen` per aggiornare `memory/project_changelog.md` automaticamente.

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

## Risparmio token — REGOLE OBBLIGATORIE

Queste regole si applicano SEMPRE, senza eccezioni:

### Lettura file
- **MAI** leggere un file intero se serve solo una sezione: usare sempre `offset` + `limit` sul Read tool.
- **MAI** ri-leggere un file appena modificato per "verificare" — Edit/Write confermano il successo con errore se falliscono.
- **MAI** ri-leggere codice già visto nella sessione corrente — ricordarlo dal contesto.
- Prima di Read, provare Grep per trovare il numero di riga esatto, poi leggere solo quelle righe (±20 righe contesto).

### Risposte
- Risposte corte per default: una frase di intro, le tool call, una frase di esito.
- Nessun riepilogo "ho fatto X, Y, Z" dopo il commit — l'utente vede il diff.
- Nessun elenco puntato di "cosa ho cambiato" se non richiesto esplicitamente.
- Nessuna spiegazione del codice se non richiesta.

### Contesto chat
- **REGOLA OBBLIGATORIA**: in ogni risposta dopo i primi ~10 scambi, aggiungere in fondo una riga: `> La chat è lunga — digita /compact prima di continuare.` — senza spiegazioni, senza preambolo.
- Usare agenti (`Agent` tool) per ricerche larghe che esploreranno molti file — proteggono il contesto principale.

### Tool usage
- Preferire `Edit` su `Write` per file esistenti (manda solo il diff, non il file intero).
- Preferire `Grep` su `Bash(grep ...)` — più efficiente.
- Chiamate tool parallele quando i dati sono indipendenti (es. leggere backend e frontend insieme).
- Non usare `Bash(cat file)` — usare `Read` con `offset`/`limit`.

## Skill disponibili
- `/deploy-check` — scan console.log, import, TODO, to_list pericolosi
- `/security` — audit MongoDB injection, auth, XSS, secrets
- `/review` — code review logico e performance
- `/ui-check` — brand consistency, accessibilità, responsive
- `/perf` — audit performance: to_list, N+1, query senza indice
- `/db-audit` — verifica user_id filter + auth su ogni endpoint
- `/api-map` — mappa tutti gli endpoint con metodo, auth, collection
- `/fix-purple` — rimuove viola residuo dal gestionale
- `/a11y` — audit accessibilità: aria-label, contrasto, touch target
- `/status` — git status + ultimi commit + TODOs in una sola lettura
- `/scope <file>` — focalizza contesto su un file/modulo specifico
- `/changelog-gen` — genera entry project_changelog.md dall'ultimo commit
- `/terse` — attiva modalità ultra-compatta (risposta max 3 righe)
- `/compact-now` — ricorda di digitare /compact per comprimere la chat
- `/ui-ux-pro-max` — design system avanzato (skill installata in `.claude/skills/`)

## Memoria persistente
La memoria del progetto è in `memory/` (MEMORY.md + file collegati). Aggiornare dopo ogni sessione.
