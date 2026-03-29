# Bruno Melito Hair - Salon Management App

## Problema Originale
App gestionale per salone (Bruno Melito Hair) con sito pubblico di prenotazione e dashboard admin (CMS, Planning, Statistiche).

## Architettura
- **Frontend**: React + Shadcn UI (porta 3000)
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB Atlas
- **Hosting**: Render (produzione), Emergent Preview (sviluppo)
- **Dominio**: brunomelitohair.it

## Credenziali
- Admin: admin@brunomelito.it / mbhs637104

## Struttura File Chiave
```
/app/frontend/src/pages/WebsitePage.jsx           -> Pagina pubblica + booking (/sito) - UNICA pagina pubblica
/app/frontend/src/pages/CardsPage.jsx              -> Gestione Card & Abbonamenti
/app/frontend/src/pages/PlanningPage.jsx           -> Calendario Planning
/app/frontend/src/pages/WebsiteAdminPage.jsx       -> Gestione Sito CMS (/gestione-sito)
/app/frontend/src/pages/SettingsPage.jsx           -> Impostazioni (temi, slot bloccati)
/app/frontend/src/pages/Dashboard.jsx              -> Dashboard admin
/app/frontend/src/components/planning/NewAppointmentDialog.jsx -> Dialog nuovo appuntamento (RISCRITTURA 29 Mar)
/app/frontend/src/lib/categories.js                -> Definizione categorie servizi
/app/frontend/src/lib/api.js                       -> Axios con interceptor JWT
/app/backend/routes/public.py                      -> API pubbliche + booking + upselling
/app/backend/routes/blocked_slots.py               -> API slot bloccati
/app/backend/routes/services.py                    -> API servizi
/app/backend/routes/clients.py                     -> API clienti
```

## Funzionalita Completate
- [x] CMS dinamico con temi e colori personalizzabili
- [x] Sistema prenotazione pubblica con blocco orari/giorni passati + buffer 30 min
- [x] Upselling nella pagina di successo prenotazione (WebsitePage.jsx)
- [x] Calendario Planning con festivita italiane e slot bloccati
- [x] Promemoria WhatsApp batch
- [x] Hero CMS personalizzabile
- [x] Temi admin personalizzabili
- [x] Pulsanti espandibili per categorie servizi
- [x] Pacchetti Preimpostati (Card Templates)
- [x] QR Code stampabile sulla pagina pubblica
- [x] Indici unici MongoDB per prevenire duplicazioni
- [x] Ordine progressivo servizi
- [x] BookingPage.jsx ELIMINATO - /prenota reindirizza a /sito
- [x] Gestione Sito salva correttamente tutte le tab
- [x] Dialog "Nuovo Appuntamento" ridisegnato per mobile (29 Mar 2026):
  - Footer fisso con bottone "Salva Appuntamento" sempre visibile
  - Servizi in categorie espandibili (accordion)
  - Riepilogo totale servizi, durata, prezzo nel footer
  - Badge conteggio servizi per categoria
  - Bottone "Occasionale" funzionante con newClientMode

## Note Importanti
- SOLO WebsitePage.jsx gestisce la pagina pubblica (/sito)
- BookingPage.jsx eliminato definitivamente (29 Mar 2026)
- /prenota reindirizza automaticamente a /sito
- Deploy su Render: sempre "Clear build cache and deploy"

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi piu richiesti)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore piu occupate
- P3: Confronto performance operatori
