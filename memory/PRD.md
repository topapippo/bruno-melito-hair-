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

### Modifiche Sessione 24/03/2026
- Servizi in ordine progressivo per categoria (condiviso pagina pubblica + planning + gestionale)
- Card & Abbonamenti come categoria cliccabile con sotto-servizi (uguale alle altre categorie)
- Bottone "Continua"/"Salva" sempre visibile (sticky bottom) su prenotazione pubblica e dialog planning
- Fix auth su tutte le pagine admin (axios → api con interceptor Bearer)
- Pulizia .gitignore root corrotto
- Operatore alternativo su conflitto orario (409 + alternative)

## Categorie Servizi (ordine condiviso)
File: `/app/frontend/src/lib/categories.js`
1. Taglio 2. Piega 3. Styling 4. Trattamenti 5. Colore 6. Modellanti 7. Permanente 8. Stiratura 9. Abbonamenti/Card 10. Prodotti e Varie 11. Altro

## API Principali
- `POST /api/public/booking` → 409 con alternative se conflitto
- `GET /api/public/website` → servizi + card_templates + config
- `GET /api/public/services` → lista servizi pubblici
- `GET /api/services` → servizi (auth)
- `GET /api/appointments?date=YYYY-MM-DD` → appuntamenti

## Deploy Render
- yarn.lock tracciato da git ✓
- .gitignore pulito ✓
- Build script: `DISABLE_ESLINT_PLUGIN=true craco build`
- Fare "Save to GitHub" poi redeploy con Clear build cache

## Backlog
- P2: Dashboard statistiche clienti
