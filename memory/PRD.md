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
/app/frontend/src/pages/WebsitePage.jsx  → Pagina pubblica + booking (/sito)
/app/frontend/src/pages/BookingPage.jsx  → Pagina alternativa (/prenota - non usata)
/app/frontend/src/pages/CardsPage.jsx    → Gestione Card & Abbonamenti
/app/frontend/src/pages/PlanningPage.jsx → Calendario Planning (refactored)
/app/frontend/src/components/planning/NewAppointmentDialog.jsx → Dialog nuovo appuntamento
/app/frontend/src/lib/categories.js      → Definizione categorie servizi
/app/backend/routes/cards.py             → API card templates e cards
/app/backend/routes/services.py          → API servizi
/app/backend/routes/public.py            → API pubbliche
```

## Funzionalità Completate
- [x] CMS dinamico con temi e colori personalizzabili
- [x] Sistema prenotazione pubblica con upselling
- [x] Calendario Planning con festività italiane e slot bloccati
- [x] Promemoria WhatsApp batch
- [x] Hero CMS personalizzabile
- [x] Temi admin personalizzabili
- [x] Refactoring PlanningPage.jsx in componenti modulari
- [x] Standardizzazione 26 servizi nel DB
- [x] Pulsanti espandibili per categorie servizi (landing + booking step 1) - WebsitePage.jsx
- [x] Pacchetti Preimpostati (Card Templates) visibili e gestibili nella pagina Card/Abbonamenti
- [x] Abbonamenti visibili nel dialog Nuovo Appuntamento del Planning

- [x] QR Code stampabile sulla pagina pubblica con pulsanti Stampa e Scarica

- [x] Eliminazione 33 foto duplicate dal database Atlas di produzione (27 Mar 2026)

## Note Importanti
- La rotta `/sito` usa WebsitePage.jsx (NON BookingPage.jsx)
- Deploy su Render: sempre "Clear build cache and deploy"
- Service Worker self-destructing attivo per cache

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi più richiesti)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
