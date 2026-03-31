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
/app/frontend/src/pages/LoyaltyPage.jsx                              -> Programma Fedelta admin
/app/frontend/src/lib/categories.js                                  -> Definizione categorie
/app/frontend/src/lib/api.js                                         -> Axios JWT
/app/frontend/src/index.css                                          -> CSS variables admin themes
/app/frontend/public/sw.js                                           -> PWA Service Worker
/app/backend/routes/public.py                                        -> API pubbliche + booking + upselling
/app/backend/routes/blocked_slots.py                                 -> API slot bloccati
/app/backend/routes/appointments.py                                  -> CRUD Appuntamenti
/app/backend/routes/loyalty.py                                       -> API Programma Fedelta
/app/backend/models.py                                               -> Modelli + DEFAULT_LOYALTY_REWARDS
/app/backend/server.py                                               -> FastAPI app + CORS + startup migrations
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
- [x] Dialog Nuovo/Modifica Appuntamento ridisegnati
- [x] Creazione appuntamento da Admin Planning
- [x] requirements.txt semplificato (no ML libraries)
- [x] Piega in categoria Styling
- [x] Formato date gg/mm/aa globale
- [x] Admin UI Theming con CSS variables
- [x] UptimeRobot HEAD support
- [x] Fix indice user_id_1_name_1
- [x] Programma Fedelta aggiornato (1pt/20EUR, 5 livelli premi)
- [x] PWA Service Worker ripristinato
- [x] Bottone Google Review WhatsApp nel checkout
- [x] Sezione Fedelta pagina pubblica aggiornata con i 5 livelli (31 Mar 2026)
- [x] Restyling completo pagina pubblica /sito (31 Mar 2026):
  - AnimatedSection: scroll-triggered fade-in animations (IntersectionObserver)
  - Hero: entrance animata, cerchi decorativi flottanti, scroll indicator
  - Galleria: lightbox con navigazione prev/next e contatore
  - Fedelta: linea di progressione rainbow, bordi colorati, ring su icone
  - Recensioni: virgolette decorative, card con hover lift
  - Contatti: icone animate hover (scale-125), bordi colorati
  - Navbar: glass-morphism migliorato (backdrop-blur-xl)
  - Footer: gradient border top, social con hover lift
  - Mobile: bottone fisso con shadow potenziato
  - Tutti i bottoni CTA con hover:scale-105 e transition fluide

## Note Importanti
- SOLO WebsitePage.jsx gestisce la pagina pubblica (/sito)
- BookingPage.jsx eliminato definitivamente
- Deploy su Render: sempre "Clear build cache and deploy"
- API card: GET /api/cards?client_id={id} (NON /api/clients/{id}/cards)
- "Cliente Occasionale" e "Cliente Generico" -> client_id = "generic"
- NON aggiungere dipendenze pesanti a requirements.txt (Render free tier OOM)
- Migrazioni schema vanno in server.py startup event per applicarle in produzione

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore piu occupate
- P3: Confronto performance operatori
