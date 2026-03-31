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
/app/frontend/src/pages/WebsitePage.jsx           -> Pagina pubblica (/sito)
/app/frontend/src/pages/Dashboard.jsx              -> Dashboard admin
/app/frontend/src/components/Layout.jsx            -> Sidebar + Nav + Page transitions
/app/frontend/src/index.css                        -> CSS variables + animazioni + override temi
/app/frontend/src/pages/PlanningPage.jsx           -> Calendario Planning
/app/frontend/src/pages/SettingsPage.jsx           -> Impostazioni + Temi Admin
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
- [x] Restyling UI "Vibrante" (31 Mar 2026):
  - Dashboard: Card moduli con sfondi gradiente solidi e icone grandi (w-7 h-7)
  - Dashboard: Card statistiche con icone grandi (w-8 h-8) e gradienti vibranti
  - Dashboard: Sezioni "Oggi" e "Prossimi" con sfondo scuro (navy/teal)
  - Sito pubblico: Sezioni alternate scuro/chiaro per contrasto massimo
  - Sito pubblico: Promozioni con sfondi solidi vibranti (rosa, teal, viola, ambra, celeste)
  - Sito pubblico: Card fedelta con gradienti solidi (ambra, rosa, teal, viola, celeste)
  - Sito pubblico: Sezione contatti su sfondo scuro con card glass-morphism
  - Sito pubblico: Footer scuro
  - 6 preset temi: Elettrico, Fuoco, Lusso, Smeraldo, Scuro, Rosa Vivace
- [x] Animazioni e transizioni (scroll, hover, stagger, page transitions)

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
