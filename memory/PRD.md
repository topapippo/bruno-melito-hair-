# Bruno Melito Hair - PRD

## Problema Originale
App gestionale per salone parrucchiere. Include prenotazione pubblica, planning operatori, gestione servizi/clienti/card/promozioni, dashboard.

## Architettura
- **Frontend**: React + craco (porta 3000)
- **Backend**: FastAPI + Python (porta 8001)
- **Database**: MongoDB Atlas
- **Hosting Produzione**: Render

## Funzionalità Implementate

### Core
- Login/Register admin
- Dashboard con statistiche e promemoria
- Planning giornaliero/settimanale/mensile (2 operatori: BRUNO, MBHS)
- Gestione servizi con categorie condivise (`/src/lib/categories.js`)
- Gestione clienti con ricerca e note
- Prenotazione pubblica dal sito (`/sito`)
- Card/Abbonamenti/Prepagate
- Promozioni e programma fedeltà
- Report incassi e registro uscite
- Backup dati
- Push notifications (VAPID)
- Promemoria WhatsApp

### Ultime Modifiche (24/03/2026)
- **Servizi progressivi per categoria**: ordine identico su pagina pubblica, planning e gestionale (Taglio → Piega → Styling → Trattamenti → Colore → Modellanti → Permanente → Stiratura → Abbonamenti/Card → Prodotti → Altro)
- **Card & Abbonamenti come categoria cliccabile**: visibile sia nella prenotazione pubblica sia nel planning, con sotto-servizi identici alle altre categorie
- **Bottone "Continua"/"Salva" sempre visibile**: sticky in basso sia nella pagina prenotazione pubblica sia nei dialog del planning (nuovo e modifica appuntamento)
- **Fix auth su tutte le pagine admin**: sostituito `axios` diretto con `api` instance (interceptor con token Bearer) su TUTTE le 20+ pagine admin
- **Pulizia .gitignore**: file root corrotto (336 righe di spazzatura) → ripulito
- **Operatore alternativo su conflitto**: backend restituisce 409 con operatori disponibili e slot alternativi

## Categorie Servizi (ordine condiviso)
File: `/app/frontend/src/lib/categories.js`
1. Taglio (blu)
2. Piega (giallo)
3. Styling (arancione)
4. Trattamenti (grigio scuro)
5. Colore (verde)
6. Modellanti (viola)
7. Permanente (viola scuro)
8. Stiratura (magenta)
9. Abbonamenti/Card (indigo)
10. Prodotti e Varie (arancione)
11. Altro (grigio)

## API Principali
- `POST /api/public/booking` → 409 con alternative se conflitto
- `GET /api/public/website` → servizi + card_templates + config
- `GET /api/public/services` → lista servizi pubblici
- `GET /api/services` → servizi (auth richiesta)
- `GET /api/appointments?date=YYYY-MM-DD` → appuntamenti giornata

## Problemi Noti
- **Render deployment**: build frontend fallisce (risolto .gitignore + yarn.lock tracciato). Utente deve fare "Save to GitHub" e poi redeploy con Clear build cache.
- **DB produzione vuoto**: card templates vanno creati manualmente dal pannello admin di produzione

## Backlog
- P1: Verifica deploy Render dopo fix
- P2: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi più richiesti)

## File Chiave
- `/app/frontend/src/lib/categories.js` - categorie condivise
- `/app/frontend/src/lib/api.js` - axios interceptor auth
- `/app/frontend/src/pages/WebsitePage.jsx` - pagina pubblica + prenotazione
- `/app/frontend/src/pages/PlanningPage.jsx` - planning admin
- `/app/frontend/src/pages/ServicesPage.jsx` - gestionale servizi
- `/app/backend/routes/public.py` - API pubblica con conflitti
