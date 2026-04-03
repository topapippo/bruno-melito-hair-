# Bruno Melito Hair — PRD

## Problema Originale
App gestionale completa per salone (Bruno Melito Hair) con sito pubblico per prenotazioni e dashboard admin (CMS, Planning, Stats).

## Architettura
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Deploy**: Render (hosting) + MongoDB Atlas (DB) + OVH (DNS)
- **Dominio**: brunomelitohair.it
- **Render Backend**: https://bruno-melito-hair-2497.onrender.com
- **GitHub**: topapippo/bruno-melito-hair-

## Credenziali
- Preview: admin@brunomelito.it / mbhs637104
- Produzione: melitobruno@gmail.com / mbhs637104

## Struttura File
```
/app/
├── backend/
│   ├── routes/ (appointments.py, public.py, stats.py, blocked_slots.py, reminders.py)
│   ├── database.py
│   └── server.py
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── planning/ (DayView, WeekView, MonthView, PlanningBanners, PlanningSearch, EditAppointmentDialog, NewAppointmentDialog, BlockSlotDialog, holidays.js)
    │   │   ├── website/ (BookingForm, BookingSuccess, MyAppointmentsModal, sections/LandingSections)
    │   │   └── ui/ (Shadcn components)
    │   ├── pages/ (WebsitePage, PlanningPage, WeeklyView, SettingsPage, ecc.)
    │   └── lib/ (api.js, categories.js, bookingUtils.js, websiteConstants.js, mediaUrl.js)
```

## Funzionalità Completate
- Landing page pubblica con sezioni dinamiche CMS
- Booking online 3 step con upselling
- Planning giornaliero/settimanale/mensile con drag & drop
- Colori per categoria servizi con triple-fallback
- Split overlap appuntamenti
- Auto-assegnazione 2° operatore con time-range overlap
- Messaggio ringraziamento WhatsApp post-incasso
- **"Prenota di nuovo"** nello storico "I Miei Appuntamenti" — pre-compila servizi dal vecchio appuntamento
- Gestione blocco slot orari, festività italiane
- Orari split pausa pranzo
- CMS temi dinamici, WhatsApp batch reminders
- Programma fedeltà, Card/Abbonamenti, QR Code
- Refactoring: WebsitePage e PlanningPage suddivisi in componenti

## Note Tecniche Critiche
- **Split Hours**: Parseare con `---` come delimitatore
- **Legacy Color Fallback**: svcById + svcByName per appuntamenti vecchi senza category
- **MongoDB ObjectId**: Sempre escludere `_id`
- **Render Deploy**: SEMPRE Clear build cache!
- **service_ids nello storico**: L'endpoint `/api/public/my-appointments` ora ritorna anche `service_ids` per il rebooking

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
