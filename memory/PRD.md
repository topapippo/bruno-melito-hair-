# Bruno Melito Hair - PRD

## App gestionale per salone parrucchiere

### Architettura
- Frontend: React + craco (porta 3000)
- Backend: FastAPI + Python (porta 8001)
- Database: MongoDB Atlas
- Hosting: Render

### Funzionalità Complete
- Login/Register admin
- Dashboard con statistiche
- Planning giornaliero/settimanale/mensile (BRUNO + MBHS)
- Gestione servizi per categorie condivise (/src/lib/categories.js)
- Gestione clienti (181+)
- Prenotazione pubblica (/sito) con servizi progressivi per categoria
- Card/Abbonamenti/Prepagate (visibili come categoria in landing + booking + planning)
- Promozioni e programma fedeltà (Sconto 5%=5pt, Sconto 10%=10pt, Omaggio=35pt)
- Report incassi e registro uscite
- Backup dati
- Push notifications (VAPID)
- Promemoria WhatsApp
- Operatore alternativo su conflitto orario (409 + scelta operatore disponibile)
- Bottone conferma sempre visibile (sticky) in booking e planning

### Categorie Servizi (ordine condiviso)
1. Taglio 2. Piega 3. Trattamenti 4. Colore 5. Permanente 6. Stiratura 7. Extra 8. Abbonamenti/Card 9. Altro 10. Prodotti

### Correzioni 24/03/2026
- Landing page usa servizi REALI dal database (non più CMS statico)
- Rimosso styling (spostato in piega)
- Rimossi duplicati modellanti (ondulazione/permanente, anticrespo/stiratura)
- Card & Abbonamenti come categoria nella landing + booking + planning
- Programma fedeltà hardcoded: 5%=5pt, 10%=10pt, Omaggio colore=35pt
- Logo leggibile su sfondo scuro
- Fix auth su tutte le pagine admin (axios → api con interceptor)
- Pulizia .gitignore corrotto
- Operatore alternativo VISIBILE al cliente (non più auto-assegnato silenziosamente)

### Deploy Render
- yarn.lock tracciato ✓
- .gitignore pulito ✓
- Build: DISABLE_ESLINT_PLUGIN=true craco build
- "Save to GitHub" → redeploy Render con Clear build cache

### Backlog
- P2: Dashboard statistiche clienti
