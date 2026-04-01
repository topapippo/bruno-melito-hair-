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
/app/frontend/src/components/planning/EditAppointmentDialog.jsx -> Checkout + Sospesi
/app/frontend/src/index.css                        -> CSS variables + animazioni
/app/frontend/src/pages/PlanningPage.jsx           -> Calendario Planning
/app/frontend/src/pages/SettingsPage.jsx           -> Impostazioni + Temi Admin
/app/frontend/src/pages/ReportIncassiPage.jsx      -> Report Incassi (aggiornato con POS/Sospeso)
/app/frontend/src/pages/DailySummaryPage.jsx       -> Riepilogo Giorno (aggiornato con POS/Sospeso)
/app/backend/routes/appointments.py                -> CRUD Appuntamenti + Checkout + Sospesi API
/app/backend/routes/loyalty.py                     -> API Programma Fedelta
/app/backend/routes/stats.py                       -> API Settings + Admin Theme
/app/backend/models.py                             -> Modelli + CheckoutData (cash/pos/sospeso/prepaid)
/app/backend/server.py                             -> FastAPI + startup migrations
```

## Funzionalita Completate
- [x] CMS dinamico con temi personalizzabili (6 preset: Elettrico, Fuoco, Lusso, Smeraldo, Scuro, Rosa Vivace)
- [x] Prenotazione pubblica con blocco orari/giorni
- [x] Upselling nella pagina di successo prenotazione
- [x] Calendario Planning con festivita italiane e slot bloccati
- [x] Promemoria WhatsApp batch
- [x] Pacchetti Preimpostati (Card Templates)
- [x] Programma Fedelta aggiornato (1pt/20EUR, 5 livelli premi)
- [x] PWA Service Worker
- [x] Google Review WhatsApp nel checkout
- [x] Restyling UI "Vibrante" con card solide, icone grandi, sezioni alternate
- [x] **Modalita di Pagamento in Cassa** (1 Apr 2026):
  - 3 metodi: Contanti, POS, Sospeso
  - Sospeso crea un debito sulla scheda cliente
  - Popup rosso di avviso "PAGAMENTO SOSPESO" all'apertura dell'appuntamento del cliente
  - Pulsanti "Salda con Contanti" e "Salda con POS" direttamente dal popup
  - Report Incassi e Riepilogo Giorno aggiornati con nuovi metodi
- [x] **Promo come Pulsante nel Booking** (1 Apr 2026):
  - Categoria "Promozioni Attive" e ora un pulsante collassabile come Card & Abbonamenti
  - Toggle selezione/deselezione con badge "SELEZIONATO"

## DB Collections
- `sospesi`: { id, user_id, client_id, client_name, appointment_id, amount, date, services[], settled, settled_at, settled_method }
- `payments`: { id, user_id, appointment_id, payment_method (cash/pos/sospeso/prepaid), total_paid, ... }

## API Endpoints Chiave
- `POST /api/appointments/{id}/checkout` - Checkout con payment_method: cash, pos, sospeso, prepaid
- `GET /api/sospesi/client/{client_id}` - Lista sospesi non saldati del cliente
- `POST /api/sospesi/{id}/settle/{method}` - Salda un sospeso (method: cash o pos)

## Note Importanti
- Deploy su Render: sempre "Clear build cache and deploy"
- Migrazioni schema vanno in server.py startup event

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore piu occupate
- P3: Confronto performance operatori
