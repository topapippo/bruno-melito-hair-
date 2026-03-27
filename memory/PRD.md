# Bruno Melito Hair - PRD

## CONFIGURAZIONE PRODUZIONE — NON MODIFICARE MAI
### ISTRUZIONI CRITICHE PER TUTTI GLI AGENTI
**LEGGERE PRIMA DI QUALSIASI MODIFICA**

- **Repository GitHub UNICO:** `topapippo/bruno-melito-hair-` (branch: main)
- **Render Frontend:** `bruno-melito-hair.onrender.com` → Custom domain: `brunomelitohair.it`
- **Render Backend:** `bruno-melito-hair-2497.onrender.com`
- **Database:** MongoDB Atlas (NON localhost!)
- **Account Produzione:** `admin@brunomelito.it` / `mbhs637104`
- **Account Secondario:** `melitobruno@gmail.com` / `mbhs637104`
- **UptimeRobot:** DEVE puntare a `https://bruno-melito-hair-2497.onrender.com/api/health`
- **DNS OVH:** brunomelitohair.it → CNAME verso Render

### REGOLE ASSOLUTE
1. MAI creare nuovi repository o servizi Render
2. MAI cambiare URL del backend nel frontend
3. MAI toccare le credenziali di produzione senza motivo
4. MAI aggiungere endpoint admin/reset temporanei
5. SEMPRE usare `REACT_APP_BACKEND_URL` per le chiamate API
6. SEMPRE: Build command Render Frontend = `REACT_APP_BACKEND_URL=https://bruno-melito-hair-2497.onrender.com yarn build`
7. SEMPRE dopo Save to GitHub: Manual Deploy → Clear build cache and deploy

### VARIABILI RENDER BACKEND
```
MONGO_URL=<stringa Atlas>
DB_NAME=mbhs
JWT_SECRET=mbhs-secret-key-2024-secure
CORS_ORIGINS=*
```

### VARIABILI RENDER FRONTEND (Build)
```
REACT_APP_BACKEND_URL=https://bruno-melito-hair-2497.onrender.com
```

---

## Architettura
- Frontend: React + craco (porta 3000)
- Backend: FastAPI + Python (porta 8001)
- Database: MongoDB Atlas (produzione) / localhost (sviluppo)
- Hosting: Render
- DNS: OVH → brunomelitohair.it

## Funzionalità Complete
- Login/Register admin
- Dashboard con statistiche (giornaliero, mensile, annuale)
- Planning giornaliero/settimanale/mensile (BRUNO + STAFF) con festività italiane
- Gestione servizi per categorie condivise
- Gestione clienti (166+)
- Prenotazione pubblica (/sito) con CMS completamente dinamico
- Card/Abbonamenti/Prepagate
- Promozioni e programma fedeltà
- Report incassi e registro uscite
- Push notifications (VAPID)
- CMS Editor completo con tema dinamico (colori, font, sfondo applicati a TUTTE le sezioni)
- Upselling Servizi post-prenotazione
- Promemoria WhatsApp batch
- Hero Customization
- Tema Gestionale personalizzabile (6 preset + colori/font/sfondo/testo custom)
- Blocco Orari (ricorrenti e singoli)
- Festività Italiane (12 + Pasqua mobile) in tutte le viste Planning

## Fix Applicati (27 Marzo 2026)
- Service Worker rimosso (causava cache vecchia)
- Timeout API: 15s → 90s con retry automatico
- Endpoint /api/health per UptimeRobot
- Migrazione dati completa da melitobruno@gmail.com a admin@brunomelito.it (clienti, servizi, operatori, gallery 33 foto, 6 recensioni, website config)
- CMS sito pubblico: TUTTI i colori ora dinamici (navbar, hero, servizi, promozioni, gallery, recensioni, fedeltà, contatti, footer)
- Tema admin: applicato a TUTTO il gestionale (non solo sidebar): sfondo pagina, testo pagina, font display, font body
- Banner festività prominente nella vista giornaliera del Planning
- Rimossi endpoint temporanei admin-reset e admin-transfer
- **Refactoring PlanningPage.jsx COMPLETATO** (27 Marzo 2026): da 2534 righe → 744 righe + 9 sotto-componenti modulari. 45/45 test superati, zero regressioni.

## Struttura Componenti Planning (dopo refactoring)
```
/app/frontend/src/components/planning/
├── holidays.js                  (37 righe - Utility festività italiane)
├── DayView.jsx                  (179 righe - Vista giornaliera con griglia operatori)
├── WeekView.jsx                 (84 righe - Vista settimanale)
├── MonthView.jsx                (64 righe - Vista mensile)
├── NewAppointmentDialog.jsx     (571 righe - Dialogo nuovo appuntamento)
├── EditAppointmentDialog.jsx    (696 righe - Dialogo modifica + checkout)
├── RecurringDialog.jsx          (173 righe - Dialogo appuntamento ricorrente)
├── LoyaltyAlertDialog.jsx       (66 righe - Alert fedeltà WhatsApp)
└── BlockSlotDialog.jsx          (93 righe - Dialogo blocco orario)
```

## Backlog
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
