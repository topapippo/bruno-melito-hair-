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
- **Colori per categoria servizi** (taglio=#0EA5E9, colore=#789F8A, trattamento=#334155, permanente=#8B5CF6, stiratura=#D946EF) con triple-fallback (category → ID → nome)
- **Split overlap appuntamenti** (computeOverlaps divide visivamente slot sovrapposti)
- **Auto-assegnazione 2° operatore** con check time-range overlap (non exact match)
- **Messaggio ringraziamento WhatsApp post-incasso** con invito a tornare e recensione
- Gestione blocco slot orari, festività italiane
- Orari split pausa pranzo (formato `08:00 - 13:00---14:00 - 19:00`)
- CMS temi dinamici, WhatsApp batch reminders
- Programma fedeltà, Card/Abbonamenti, QR Code
- Refactoring: WebsitePage (1686→449), PlanningPage (763→640)

## Note Tecniche Critiche
- **Split Hours**: Parseare con `---` come delimitatore
- **Legacy Color Fallback**: svcById + svcByName per appuntamenti vecchi senza category
- **MongoDB ObjectId**: Sempre escludere `_id`
- **Render Deploy**: SEMPRE Clear build cache!

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
