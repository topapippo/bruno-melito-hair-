# Bruno Melito Hair — Istruzioni per Claude

## Progetto
Gestionale salone + sito pubblico. React (frontend) + FastAPI (backend) + MongoDB (motor async). Deploy Render (free, 512MB). Repo `https://github.com/topapippo/bruno-melito-hair-.git`, branch `main` = produzione (auto-deploy al push).

## Regole tecniche critiche (prevengono bug)

### Backend
- `db` = motor async MongoDB (da `database.py`)
- Ogni query MongoDB filtra per `"user_id": current_user["id"]`; endpoint protetti con `Depends(get_current_user)`
- `to_list(N)`: MAX 30000 non filtrate, MAX 5000 filtrate per utente
- Unique index `clients` = `(user_id, name)`: cercare SEMPRE prima di `insert_one`
- PIL (Pillow): import lazy DENTRO la funzione
- NIENTE `console.log`/print di debug in produzione

### Frontend
- API: `process.env.REACT_APP_BACKEND_URL` + `/api`; token in `localStorage['token']` (interceptor `lib/api.js`)
- Errori: usare `getErrorMessage()` di `lib/api.js` (mai `err.response.data.detail` diretto → crash su 422)
- Redirect 401 solo su route non pubbliche (non `/sito/*`, non `/booking`)
- Brand: rose `#C8617A`, oro `#D4AF7A`, espresso `#1A0A10`, sfondo `#FDF8F5`, testo `#2D1B14`. MAI viola nel gestionale (nel sito pubblico correggere solo se segnalato)
- Animazioni: `useReducedMotion()` da framer-motion

## Workflow
- Dopo ogni feature: commit descrittivo + push subito (senza aspettare richiesta).
- Prima del push: grep `console.log` sui file staged; se trovato, rimuovere.
- Controlli qualità (`/security`, `/deploy-check`, `/perf`, `/db-audit`, `/ui-check`, `/a11y`) SOLO su richiesta o prima di un push importante — non a ogni modifica.
- Fine sessione: aggiornare `memory/project_changelog.md`.

## Risparmio token
- Leggere solo il punto preciso (Grep → poi Read con offset/limit); mai file interi, mai ri-leggere ciò già visto o appena modificato.
- Risposte corte: intro breve, tool call, esito. Niente riepiloghi/spiegazioni non richiesti (l'utente vede il diff).
- Edit > Write su file esistenti; Grep > `bash grep`; tool paralleli per dati indipendenti.
- Agenti (`Agent`) per ricerche larghe su molti file.

## Memoria e skill
- Memoria progetto in `memory/` (MEMORY.md + file collegati).
- Skill custom in `.claude/skills/` e slash-command in `.claude/commands/` — invocarle quando servono.
