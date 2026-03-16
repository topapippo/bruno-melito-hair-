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

## Routing (Aggiornato 16 Marzo 2026)
- `/` → Sito Web Pubblico (WebsitePage)
- `/login` → Pagina Login Admin
- `/planning` → Planning giornaliero (dopo login)
- `/sito` → Redirect a `/`
- `/prenota` → Redirect a `/`

## Funzionalità Implementate

### Sito Web Pubblico (/)
- Landing page professionale con logo e branding (logo grande, alta opacità)
- Sezione servizi con listino prezzi espandibile
- Gallery salone e lavori
- Recensioni clienti
- Programma fedeltà
- Promozioni attive (cliccabili per prenotare)
- Contatti e social links (Instagram, Facebook, YouTube)
- Sistema prenotazione online integrato (3 step: servizi → data/ora → dati cliente)
- Gestione appuntamenti (modifica/cancella con numero telefono)
- CTA mobile fisso
- Animazioni hover su tutti gli elementi interattivi
- Design coerente light-theme

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

## Dati nel Database
- 165 Clienti
- 21 Servizi
- 7 Promozioni
- 4 Foto Gallery

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
│   │   │   ├── WebsitePage.jsx (Sito Pubblico + Prenotazioni)
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PlanningPage.jsx
│   │   │   └── ...
│   │   ├── context/AuthContext.js
│   │   └── App.js (Routing principale)
│   └── public/
```

## Completato (16 Marzo 2026)
- Fix routing: `/` mostra il sito pubblico, `/login` mostra login admin
- `/sito` e `/prenota` redirect a `/`
- Dopo login, redirect a `/planning` invece di `/`
- Logo più grande e prominente nell'hero (w-96 su desktop)
- Overlay più scuro nell'hero per miglior leggibilità testo
- Pulsanti hero con backdrop-blur e stile glass
- Animazioni hover su tutti i bottoni (scale, shadow, translate)
- Underline animato sui link navbar
- Fix colori recensioni (da tema scuro a tema chiaro)
- Fix colori testo About features (da text-gray-300 a text-[#475569])
- Rimosso link social "Sito Web" che puntava alla preview URL
- Footer: link aggiornati a button con onClick
- Animazione fade-in per il logo hero
- Hover scale su card contatti, promozioni, gallery, loyalty

## Backlog / Da Fare
- [ ] P1: Redesign più approfondito di WebsitePage.jsx (componenti modulari)
- [ ] P2: Merge dei due repository (BRUNO-MELITO-HAIR + MBHS-GESTIONALE-EMERGENT)
- [ ] P2: Verifica dati storici nel database di produzione
- [ ] P3: Refactoring WebsitePage.jsx in componenti più piccoli
- [ ] P3: Ottimizzazione performance e SEO
- [ ] Configurare dominio brunomelitohair.it
- [ ] Migrare dati su database Render

## Note Tecniche
- JWT per autenticazione
- CORS configurato per tutti gli origins
- Hot reload abilitato in development
- PWA installabile come app desktop
