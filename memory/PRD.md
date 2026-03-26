# Bruno Melito Hair - PRD

## App gestionale per salone parrucchiere

### Architettura
- Frontend: React + craco (porta 3000)
- Backend: FastAPI + Python (porta 8001)
- Database: MongoDB (locale: mbhs)
- Hosting: Render

### Funzionalita Complete
- Login/Register admin (admin@brunomelito.it / mbhs637104)
- Dashboard con statistiche
- Planning giornaliero/settimanale/mensile (BRUNO + MBHS)
- Gestione servizi per categorie condivise (/src/lib/categories.js)
- Gestione clienti (181+)
- Prenotazione pubblica (/sito) con servizi progressivi per categoria
- Card/Abbonamenti/Prepagate (visibili come categoria)
- Promozioni e programma fedelta (5%=5pt, 10%=10pt, Omaggio=35pt)
- Report incassi e registro uscite
- Backup dati
- Push notifications (VAPID)
- Operatore alternativo su conflitto orario (panel con DISPONIBILE + orari alternativi)
- Bottone conferma sempre visibile (sticky)

### I Miei Appuntamenti (NUOVO)
- Bottone "Appuntamenti" nel navbar del sito pubblico
- La cliente inserisce il numero di telefono
- Vede appuntamenti futuri con possibilita di MODIFICARE data/ora o ANNULLARE
- Vede storico ultimi 3 mesi con stato e prezzo
- Verifica telefono per sicurezza (403 se non corrisponde)
- API: GET /api/public/my-appointments?phone=XXX
- API: PUT /api/public/appointments/{id} (modifica)
- API: DELETE /api/public/appointments/{id}?phone=XXX (annulla)

### CMS Editor (/gestione-sito)
- Tab Generale: nome salone, sottotitolo, descrizione, about
- Tab Layout: riordinamento sezioni (su/giu), nascondi/mostra sezioni + Ripristina ordine predefinito
  - Sezioni: services, salon, about, promotions, reviews, gallery, loyalty, contact
  - Hero (fisso in cima) e Footer (fisso in fondo)
- Tab Aspetto: 10 temi preimpostati (Elegante Scuro, Rosa Classico, Blu Moderno, Oro & Nero, Verde Natura, Viola Lusso, Corallo, Minimal Bianco, Teal Fresco, Borgogna), colori (primario, accento, sfondo, testo), font (titoli, corpo), anteprima live in tempo reale
- Tab Servizi, Foto Salone, Gallery Lavori, Recensioni, Orari & Contatti

### Sito Pubblico (/sito)
- Rendering dinamico sezioni basato su section_order e hidden_sections dal CMS
- Hero, Servizi, Foto Salone, Chi Siamo, Promozioni, Recensioni, Gallery, Fedelta, Contatti, Footer
- Badge "Made with Emergent" RIMOSSO
- Bottone "Accedi" (Area Riservata) visibile su mobile con sfondo grigio
- Bottone "Appuntamenti" per verifica appuntamenti della cliente

### Deploy Render
- GitHub Repo: topapippo/bruno-melito-hair-
- Render Frontend: bruno-melito-hair- (brunomelitohair.it) - Static Site
- Render Backend: BRUNO-MELITO-HAIR (bruno-melito-hair-2497.onrender.com)
- Build: REACT_APP_BACKEND_URL=https://bruno-melito-hair-2497.onrender.com yarn build
- Root Directory: frontend
- Publish Directory: build
- Redirects/Rewrites: /* -> /index.html (Rewrite) - NECESSARIO per React SPA
- IMPORTANTE: Dopo ogni Save to GitHub, fare Manual Deploy con Clear build cache

### Problemi Noti
- Il dominio brunomelitohair.it potrebbe servire versione cached. Verificare su bruno-melito-hair.onrender.com per la versione aggiornata. La cache CDN si aggiorna da sola.

### Backlog
- P2: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi piu richiesti)
