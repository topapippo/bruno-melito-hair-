# MBHS - Bruno Melito Hair Stylist - Gestionale

## Descrizione Progetto
Sistema gestionale completo per salone di parrucchiere "Bruno Melito Hair" a Santa Maria Capua Vetere.

## URL dell'Applicazione
- **Sito Web Pubblico:** https://melito-public-site.preview.emergentagent.com/
- **Gestionale (Area Riservata):** https://melito-public-site.preview.emergentagent.com/login
- **Credenziali Admin:** admin@brunomelito.it / Admin123!

## Architettura
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **PWA:** Installabile come app su PC/mobile

## Routing
- `/` → Sito Web Pubblico (WebsitePage)
- `/login` → Pagina Login Admin
- `/planning` → Planning giornaliero (dopo login)
- `/sito` → Redirect a `/`
- `/prenota` → Redirect a `/`
- `/reminders` → Promemoria & Richiami WhatsApp

## Funzionalità Implementate

### Sito Web Pubblico (/)
- Landing page professionale con logo grande e animazioni
- Sezione servizi con listino prezzi espandibile e **servizi cliccabili** (aprono prenotazione)
- Gallery salone e lavori con hover animations
- Recensioni clienti (tema chiaro)
- Programma fedeltà con card animate
- **Promozioni attive cliccabili** (prenotazione con promo pre-applicata)
- Contatti e social links (Instagram, Facebook, YouTube)
- Sistema prenotazione online integrato (3 step)
- Gestione appuntamenti (modifica/cancella)
- CTA mobile fisso
- Design coerente light-theme con hover animations

### Gestionale (/login → /planning)
- Planning giornaliero con timeline visiva
- Dashboard con statistiche
- Agenda appuntamenti
- Vista settimanale e mensile
- Gestione Clienti (165 clienti importati)
- Gestione Servizi (21 servizi)
- Operatori
- Card/Abbonamenti
- Programma Fedeltà
- Promozioni (7 promozioni)
- Report Incassi
- Registro Uscite
- Statistiche
- Backup Dati
- Gestione Sito Web (CMS)
- **Promemoria WhatsApp automatici** (banner alle 14:00+, invio batch)
- Template messaggi personalizzabili
- Richiami clienti inattivi

## Dati nel Database
- 165 Clienti
- 21 Servizi
- 7 Promozioni
- 4 Foto Gallery
- 5 Template Messaggi

## Struttura File
```
/app/
├── backend/
│   ├── server.py
│   ├── utils.py (format_phone_whatsapp, no Twilio)
│   ├── routes/
│   │   ├── auth.py
│   │   ├── clients.py
│   │   ├── services.py
│   │   ├── appointments.py
│   │   ├── promotions.py
│   │   ├── public.py (con video range request)
│   │   ├── reminders.py (WhatsApp, no SMS)
│   │   ├── notifications.py
│   │   ├── stats.py
│   │   └── ...
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── WebsitePage.jsx (Sito Pubblico + Prenotazioni)
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PlanningPage.jsx (con banner promemoria)
│   │   │   ├── RemindersPage.jsx (WhatsApp promemoria)
│   │   │   └── ...
│   │   ├── context/AuthContext.js
│   │   └── App.js (Routing)
│   └── public/
```

## Changelog

### 16 Marzo 2026
- Fix routing: `/` → sito pubblico, `/login` → login admin
- `/sito` e `/prenota` redirect a `/`, dopo login redirect a `/planning`
- Logo più grande e prominente nell'hero
- Overlay più scuro per leggibilità
- Animazioni hover su tutti gli elementi interattivi
- Fix colori recensioni (da tema scuro a chiaro)
- Fix colori About features
- Rimosso link social "Sito Web" a preview URL
- Footer: link aggiornati con onClick
- **Servizi cliccabili** sulla landing page → aprono booking con servizio pre-selezionato
- **Promozioni cliccabili** → aprono booking con promo pre-applicata
- **Rimosso Twilio SMS** (non serve)
- Aggiunto `format_phone_whatsapp()` in utils.py
- Aggiunto endpoint `/api/whatsapp/generate-link`
- Merge video range request da MBHS per riproduzione video HTML5
- Aggiunta animazione fade-in CSS

## Backlog
- [ ] Refactoring WebsitePage.jsx in componenti più piccoli (attualmente ~870 righe)
- [ ] Ottimizzazione performance e SEO
- [ ] Configurare dominio brunomelitohair.it su Render
- [ ] Aggiungere numeri telefono ai clienti mancanti per promemoria WhatsApp
