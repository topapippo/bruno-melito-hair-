# MBHS - Bruno Melito Hair Stylist - Gestionale

## Descrizione Progetto
Sistema gestionale completo per salone di parrucchiere "Bruno Melito Hair" a Santa Maria Capua Vetere.

## URL dell'Applicazione
- **Sito Web Pubblico:** https://design-stile-fix.preview.emergentagent.com/
- **Gestionale (Area Riservata):** https://design-stile-fix.preview.emergentagent.com/login
- **Credenziali Admin:** admin@brunomelito.it / Admin123!
- **Credenziali Produzione (Render):** melitobruno@gmail.com / mbhs637104

## Architettura
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **PWA:** Installabile come app su PC/mobile

## Routing
- `/` → Sito Web Pubblico (WebsitePage)
- `/login` → Pagina Login Admin
- `/planning` → Planning giornaliero (dopo login)
- `/gestione-sito` → Admin CMS Sito Web
- `/sito` → Redirect a `/`
- `/prenota` → Redirect a `/`
- `/reminders` → Promemoria & Richiami WhatsApp

## Funzionalita Implementate

### Sito Web Pubblico (/)
- Landing page professionale con logo grande e animazioni
- Sezione servizi con listino prezzi espandibile e servizi cliccabili
- Gallery salone e lavori con hover animations
- Recensioni clienti (tema chiaro)
- Programma fedelta con card animate
- Promozioni attive cliccabili
- Contatti e social links (Instagram, Facebook, YouTube)
- Sistema prenotazione online integrato (3 step)
- Gestione appuntamenti (modifica/cancella)
- CTA mobile fisso
- Colori e font dinamici da CMS

### Gestionale (/login → /planning)
- Planning giornaliero con timeline visiva
- Dashboard con statistiche
- Agenda appuntamenti
- Vista settimanale e mensile
- Gestione Clienti (165 clienti importati)
- Gestione Servizi (21 servizi)
- Operatori
- Card/Abbonamenti
- Programma Fedelta
- Promozioni (7 promozioni)
- Report Incassi
- Registro Uscite
- Statistiche
- Backup Dati
- Gestione Sito Web (CMS) - COMPLETO con tab Design & Stile
- Promemoria WhatsApp automatici
- Template messaggi personalizzabili
- Richiami clienti inattivi

### CMS Gestione Sito (/gestione-sito) - 7 Tab
1. **Generale** - Nome salone, descrizione, chi siamo, punti di forza
2. **Colori & Font** - Colore primario, accento, sfondo, testo + Font titoli e corpo con anteprima live
3. **Servizi** - Categorie servizi con listino pubblico
4. **Foto Salone** - Upload e gestione foto/video salone
5. **Gallery Lavori** - Upload e gestione portfolio lavori
6. **Recensioni** - CRUD recensioni clienti
7. **Orari & Contatti** - Orari apertura, email, telefoni, WhatsApp, indirizzo

## Dati nel Database
- 165 Clienti
- 21 Servizi
- 7 Promozioni
- 4 Foto Gallery
- 5 Template Messaggi

## API Endpoints Chiave
- POST /api/auth/login
- GET /api/auth/me
- GET /api/public/website
- GET/PUT /api/website/config (autenticato)
- GET/POST/PUT/DELETE /api/website/reviews
- GET/POST/DELETE /api/website/gallery
- POST /api/website/upload

## Changelog

### 17 Marzo 2026
- Implementato tab "Colori & Font" in Gestione Sito (WebsiteAdminPage.jsx)
- Color picker per: colore primario, accento, sfondo, testo
- Selettori font: 6 opzioni titoli (Cormorant Garamond, Playfair Display, Lora, Merriweather, DM Serif Display, Libre Baskerville) e 6 opzioni corpo (Nunito, Open Sans, Lato, Poppins, Source Sans 3, Raleway)
- Anteprima colori e font in tempo reale
- WebsitePage.jsx ora legge colori e font dinamicamente dal CMS (getGStyles function)
- Aggiunti campi default nel backend: primary_color, accent_color, bg_color, text_color, font_display, font_body
- 15/15 test passati (backend + frontend)

### 16 Marzo 2026
- Fix routing: `/` → sito pubblico, `/login` → login admin
- Logo piu grande e prominente nell'hero
- Servizi cliccabili sulla landing page
- Promozioni cliccabili
- Rimosso Twilio SMS
- Aggiunto format_phone_whatsapp() in utils.py
- Merge video range request

## Backlog
- [ ] Verifica utente: dati clienti (telefoni, card) visibili dopo login produzione
- [ ] Refactoring WebsitePage.jsx in componenti piu piccoli (1500+ righe)
- [ ] Refactoring WebsiteAdminPage.jsx (600+ righe)
- [ ] Ottimizzazione performance e SEO
- [ ] Configurare dominio brunomelitohair.it su Render
- [ ] Aggiungere numeri telefono ai clienti mancanti per promemoria WhatsApp
- [ ] Pulizia repository GitHub vecchi
