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

## Palette Colori "Vivace Bloom" (31 Mar 2026)
- Primary: #E8477C (hot pink/coral vivace)
- Accent: #2EC4B6 (teal brillante)
- Secondary: #F59E0B (ambra caldo)
- Content BG: #FCFCFD (bianco pulito)
- Sidebar BG: #FAFBFC (bianco leggero)
- Text Dark: #1A1A2E (navy scuro - alta leggibilita)
- Text Light: #8891A5 (grigio secondario)

## Struttura File Chiave
```
/app/frontend/src/pages/WebsitePage.jsx           -> Pagina pubblica (/sito)
/app/frontend/src/pages/Dashboard.jsx              -> Dashboard admin
/app/frontend/src/components/Layout.jsx            -> Sidebar + Nav + Page transitions
/app/frontend/src/index.css                        -> CSS variables + animazioni + override temi
/app/frontend/src/pages/PlanningPage.jsx           -> Calendario Planning
/app/frontend/src/components/planning/*.jsx        -> Dialog appuntamenti
/app/frontend/src/pages/SettingsPage.jsx           -> Impostazioni
/app/backend/routes/appointments.py                -> CRUD Appuntamenti
/app/backend/routes/loyalty.py                     -> API Programma Fedelta
/app/backend/routes/stats.py                       -> API Settings + Admin Theme
/app/backend/models.py                             -> Modelli + DEFAULT_LOYALTY_REWARDS
/app/backend/server.py                             -> FastAPI + startup migrations
```

## Funzionalita Completate
- [x] CMS dinamico con temi personalizzabili
- [x] Prenotazione pubblica con blocco orari/giorni
- [x] Upselling nella pagina di successo prenotazione
- [x] Calendario Planning con festivita italiane e slot bloccati
- [x] Promemoria WhatsApp batch
- [x] Pacchetti Preimpostati (Card Templates)
- [x] Programma Fedelta aggiornato (1pt/20EUR, 5 livelli premi)
- [x] PWA Service Worker ripristinato
- [x] Google Review WhatsApp nel checkout
- [x] Restyling pagina pubblica (scroll animations, hero animato, lightbox galleria, progress fedelta)
- [x] Restyling gestionale admin (page transitions, stagger animations, sidebar hover, card hover)
- [x] Palette colori "Vivace Bloom" (31 Mar 2026):
  - Colori vivaci e allegri su tutti i componenti
  - Background bianco pulito per massima leggibilita
  - Testi navy scuri per alto contrasto
  - Stat cards: 5 colori distinti (rosa, teal, ambra, blu, viola)
  - Moduli: 19 icone con gradienti colorati unici
  - Pagina pubblica: stessi colori del gestionale
  - CSS override per backward compatibility
  - Migrazione automatica DB per aggiornare tema in produzione

## Note Importanti
- Deploy su Render: sempre "Clear build cache and deploy"
- NON aggiungere dipendenze pesanti a requirements.txt (Render free tier OOM)
- Migrazioni schema vanno in server.py startup event
- CSS override in index.css supporta sia vecchi che nuovi hex per retrocompatibilita

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore piu occupate
- P3: Confronto performance operatori
