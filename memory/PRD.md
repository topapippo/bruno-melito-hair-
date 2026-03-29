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
/app/frontend/src/pages/WebsitePage.jsx                              -> Pagina pubblica (/sito)
/app/frontend/src/pages/PlanningPage.jsx                             -> Calendario Planning
/app/frontend/src/components/planning/NewAppointmentDialog.jsx       -> Dialog nuovo appuntamento
/app/frontend/src/components/planning/EditAppointmentDialog.jsx      -> Dialog modifica appuntamento
/app/frontend/src/pages/WebsiteAdminPage.jsx                         -> Gestione Sito CMS
/app/frontend/src/pages/SettingsPage.jsx                             -> Impostazioni
/app/frontend/src/pages/Dashboard.jsx                                -> Dashboard admin
/app/frontend/src/pages/CardsPage.jsx                                -> Gestione Card
/app/frontend/src/lib/categories.js                                  -> Definizione categorie
/app/frontend/src/lib/api.js                                         -> Axios JWT
/app/backend/routes/public.py                                        -> API pubbliche + booking + upselling
/app/backend/routes/blocked_slots.py                                 -> API slot bloccati
```

## Funzionalita Completate
- [x] CMS dinamico con temi personalizzabili
- [x] Prenotazione pubblica con blocco orari/giorni + buffer 30 min
- [x] Upselling nella pagina di successo prenotazione
- [x] Calendario Planning con festivita italiane e slot bloccati
- [x] Promemoria WhatsApp batch
- [x] Pacchetti Preimpostati (Card Templates)
- [x] QR Code stampabile
- [x] Indici unici MongoDB anti-duplicazione
- [x] Ordine progressivo servizi
- [x] BookingPage.jsx ELIMINATO - /prenota reindirizza a /sito
- [x] Dialog Nuovo/Modifica Appuntamento ridisegnati:
  - Footer fisso con bottoni sempre visibili
  - Servizi in categorie espandibili accordion
  - Sezione ABBONAMENTI/CARD CLIENTE con saldo residuo (29 Mar 2026)
  - Sezione PROMOZIONI espandibile con servizi omaggio
  - Calcolo automatico nel footer: totale - sconto card = da pagare
  - Auto-espansione card/promo quando cliente selezionato
  - INCASSA auto-applica card/promo pre-selezionate

## Note Importanti
- SOLO WebsitePage.jsx gestisce la pagina pubblica (/sito)
- BookingPage.jsx eliminato definitivamente
- Deploy su Render: sempre "Clear build cache and deploy"
- API card: GET /api/cards?client_id={id} (NON /api/clients/{id}/cards)

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore piu occupate
- P3: Confronto performance operatori
