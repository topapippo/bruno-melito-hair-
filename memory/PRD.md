# Bruno Melito Hair — PRD

## Problema Originale
App gestionale completa per salone (Bruno Melito Hair) con sito pubblico per prenotazioni e dashboard admin (CMS, Planning, Stats).

## Architettura
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Deploy**: Render (hosting) + MongoDB Atlas (DB) + OVH (DNS)
- **Dominio**: brunomelitohair.it

## Credenziali
- Preview: admin@brunomelito.it / mbhs637104
- Produzione: melitobruno@gmail.com / mbhs637104

## Struttura File Principali
```
/app/
├── backend/
│   ├── routes/ (appointments.py, public.py, stats.py, blocked_slots.py, reminders.py)
│   ├── database.py
│   └── server.py
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── planning/ (DayView, WeekView, MonthView, PlanningBanners, PlanningSearch, NewAppointmentDialog, EditAppointmentDialog, BlockSlotDialog, holidays.js)
    │   │   ├── website/ (BookingForm, BookingSuccess, MyAppointmentsModal, sections/LandingSections)
    │   │   └── ui/ (Shadcn components)
    │   ├── pages/ (WebsitePage, PlanningPage, WeeklyView, SettingsPage, ecc.)
    │   └── lib/ (api.js, categories.js, bookingUtils.js, websiteConstants.js, mediaUrl.js)
```

## Funzionalità Completate
- Landing page pubblica con sezioni dinamiche CMS
- Booking online 3 step (servizi, data/ora, dati cliente) con upselling
- Planning giornaliero/settimanale/mensile con drag & drop
- Auto-assegnazione 2° operatore su conflitto orario
- Colori categorie servizi (Styling, Trattamenti, Colore, ecc.)
- Gestione blocco slot orari
- Festività italiane evidenziate nel planning
- Orari split pausa pranzo (formato `08:00 - 13:00---14:00 - 19:00`)
- CMS temi dinamici (colori, font) per sito pubblico e dashboard admin
- WhatsApp batch reminders
- Programma fedeltà punti
- Card/Abbonamenti
- QR Code prenotazione
- Promozioni attive
- Report incassi e spese
- "I Miei Appuntamenti" per clienti (lookup via telefono)
- **Refactoring completato**: WebsitePage.jsx (1686→449 righe), PlanningPage.jsx (763→573 righe)

## Note Tecniche Critiche
- **Split Hours**: Formato `08:00 - 13:00---14:00 - 19:00` → parseare con `---` come delimitatore
- **Legacy Color Fallback**: Appuntamenti vecchi senza campo `category` → fallback lookup su lista servizi
- **MongoDB ObjectId**: Sempre escludere `_id` nelle risposte JSON

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi più richiesti)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
