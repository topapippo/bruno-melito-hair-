# MBHS - Bruno Melito Hair Stylist - Gestionale

## Descrizione Progetto
Sistema gestionale completo per salone di parrucchiere "Bruno Melito Hair" a Santa Maria Capua Vetere.

## URL dell'Applicazione
- **Sito Web Pubblico + Prenotazioni:** https://melito-public-site.preview.emergentagent.com/sito
- **Gestionale (Area Riservata):** https://melito-public-site.preview.emergentagent.com/login
- **Credenziali Admin:** admin@brunomelito.it / Admin123!

## Architettura
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **PWA:** Installabile come app su PC/mobile

## Funzionalità Implementate

### Sito Web Pubblico (/sito)
- Landing page professionale con logo e branding
- Sezione servizi con listino prezzi espandibile
- Gallery salone e lavori
- Recensioni clienti
- Programma fedeltà
- Promozioni attive
- Contatti e social links
- **Sistema prenotazione online integrato** (3 step: servizi → data/ora → dati cliente)
- **Gestione appuntamenti** (modifica/cancella con numero telefono)
- CTA mobile fisso

### Gestionale (/login → /planning)
- **Planning giornaliero** con timeline visiva
- **Dashboard** con statistiche
- **Agenda** appuntamenti
- **Vista settimanale e mensile**
- **Gestione Clienti** (165 clienti importati)
- **Gestione Servizi** (18 servizi in 4 categorie)
- **Operatori**
- **Card/Abbonamenti**
- **Programma Fedeltà**
- **Promozioni**
- **Report Incassi**
- **Registro Uscite**
- **Statistiche**
- **Backup Dati**
- **Gestione Sito Web** (CMS)

## Dati Importati
- 165 Clienti
- 18 Servizi (Taglio, Piega, Trattamenti, Colore)
- 8 Promozioni
- 5 Template WhatsApp

## Struttura File Principali
```
/app/
├── backend/
│   ├── server.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── clients.py
│   │   ├── services.py
│   │   ├── appointments.py
│   │   ├── promotions.py
│   │   └── public.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── WebsitePage.jsx (Sito + Prenotazioni unificato)
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PlanningPage.jsx
│   │   │   ├── ClientsPage.jsx
│   │   │   └── ...
│   │   ├── context/AuthContext.js
│   │   └── App.js
│   └── public/
│       ├── manifest.json (PWA sito)
│       └── manifest-gestionale.json (PWA gestionale)
```

## Modifiche Recenti (7 Marzo 2026)
- ✅ Importato progetto da ZIP utente
- ✅ Unificata pagina Web + Prenotazioni in WebsitePage.jsx
- ✅ Rimossa BookingPage.jsx (redirect /prenota → /sito)
- ✅ Aggiunta funzione "Gestisci Appuntamento" al sito pubblico
- ✅ Creato manifest PWA separato per gestionale
- ✅ Verificati 165 clienti e 18 servizi nel database

## Da Fare (per deploy su Railway)
- [ ] Configurare dominio brunomelitohair.it
- [ ] Verificare certificato SSL
- [ ] Testare routing SPA su Railway (serve.json + --single flag)
- [ ] Migrare dati su database Railway

## Note Tecniche
- JWT per autenticazione
- CORS configurato per tutti gli origins
- Hot reload abilitato in development
- PWA installabile come app desktop
