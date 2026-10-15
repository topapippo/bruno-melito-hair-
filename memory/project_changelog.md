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

## 2026-10-15

### Sessione: sito pubblico — tipografia, colori, sezioni

- Caratteri alleggeriti: Google Fonts caricati da `index.html`, rimosso `@import` da `index.css`
- "Cosa facciamo" e "3 Tocchi": colori e pulsanti a categorie piatte con accento primario, categorie iniziali chiuse
- Hero: saluto più corto (si chiude al click), aggiunto pulsante Chiama
- Juicer (feed Instagram) rimosso, sostituito da blocco social con link
- Titoli `<h2>` di sezione da `font-black` a `font-semibold` (11 titoli in `LandingSections.jsx` e `WebsitePage.jsx`)
- "✦ Vantaggi Esclusivi" in rosa pieno `#FF7FA8`
- "La nostra storia": "E Stile" in rosa pieno, testi più leggibili, tre riquadri (Consulenza su misura, Accoglienza, Sposa e cerimonie)
- Recensioni: massimo 3 in griglia, etichetta "Recensione Google", pulsante verso Google se `maps_url` è impostato

**Commit** `a202718` (titoli, "Vantaggi Esclusivi") e `856be6e` (La nostra storia, recensioni) su `main`

### Aggiornamenti sito pubblico

- Team: aggiunte frasi per Bruno, Bruna e Roberta
- Test: rimosso il report pytest iteration19 con riferimenti a `access_token`; nei report rimasti non compare `eyJ`, ma `access_token` è menzionato nelle iterazioni 38, 39, 40, 41 e 43
- Dati pubblici dello staff: escluso il telefono
- Hero video: aggiunta immagine di caricamento
- Testi: aumentato il contrasto delle classi `text-white/*` indicate
