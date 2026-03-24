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
- Card/Abbonamenti/Prepagate (visibili come categoria)
- Promozioni e programma fedeltà (5%=5pt, 10%=10pt, Omaggio=35pt)
- Report incassi e registro uscite
- Backup dati
- Push notifications (VAPID)
- Operatore alternativo su conflitto orario
- Bottone conferma sempre visibile (sticky)

### CMS Editor (/gestione-sito)
- Tab Generale: nome salone, sottotitolo, descrizione, about
- Tab Aspetto: colori (primario, accento, sfondo, testo), font (titoli, corpo), dimensioni
- Tab Servizi: categorie aggiuntive
- Tab Foto Salone, Gallery Lavori, Recensioni
- Tab Orari & Contatti
- Bottone "Salva e Vedi Live" + "Anteprima Sito"

### Messaggistica WhatsApp (tutte attive)
1. Conferma prenotazione online → bottone WhatsApp dopo booking
2. Promemoria appuntamento domani → RemindersPage
3. Scadenza colore 30+ giorni → RemindersPage
4. Scadenza abbonamento/card → CardAlertsPage
5. Cliente inattivo 60+ giorni → RemindersPage
6. Templates messaggi personalizzabili

### Deploy Render
- yarn.lock tracciato, .gitignore pulito
- Build: DISABLE_ESLINT_PLUGIN=true craco build
- "Save to GitHub" → redeploy con Clear build cache

### Backlog
- P2: Dashboard statistiche clienti
