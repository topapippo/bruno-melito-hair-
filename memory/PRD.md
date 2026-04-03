# Bruno Melito Hair - PRD

## Problema Originale
App gestionale per salone (Bruno Melito Hair) con sito pubblico prenotazioni e dashboard admin (CMS, Planning, Statistiche).

## Architettura
- Frontend: React + Shadcn/UI + date-fns
- Backend: FastAPI + MongoDB (Atlas in produzione, locale in preview)
- Deploy: Render (frontend + backend) + Custom Domain (brunomelitohair.it)
- DNS: OVH
- Produzione API: https://bruno-melito-hair-2497.onrender.com/api

## Funzionalita Completate
- Sistema di prenotazione pubblica con calcolo disponibilita (festivi, pausa pranzo, orari split)
- Selettore orario compatto a scorrimento (dropdown Mattina/Pomeriggio)
- Planning giornaliero con drag & drop e colonne operatori
- Planning settimanale con griglia 15min, drag & drop tra giorni, overlap split
- Colori per CATEGORIA servizi (Styling=azzurro, Trattamenti=grigio, Colore=verde, Permanente=viola, Stiratura=magenta, Abbonamenti=indaco)
- Auto-assegnazione 2° operatore su conflitto orario
- Planning mensile
- Checkout avanzato (Contanti, POS, Sospesi, Abbonamenti)
- Programma fedelta
- CMS personalizzazione temi (variabili CSS dinamiche)
- WhatsApp batch reminders
- Gestione slot bloccati (CRUD + context menu)
- Festivita italiane evidenziate
- Upselling servizi post-prenotazione
- Hero image e slogan personalizzabili
- PWA Service Worker
- Bottone "I Miei Appuntamenti" con sottotitolo mobile
- Sezione servizi "Scopri Cosa Offriamo" visibile di default

## Bug Fix Critici (01-03/04/2026)
### Fix Orari Split (Pausa Pranzo) - 01/04
- Regex globale per catturare tutti gli intervalli orari (08:00-13:00---14:00-19:00)
- Corretti: WebsitePage.jsx + NewAppointmentDialog.jsx

### Vista Settimanale Completa - 02/04
- Riscrittura WeekView.jsx con griglia 15min, drag&drop, overlap split

### Colori Categoria Servizi - 03/04
- DayView, WeekView, WeeklyView ora colorano per categoria servizio
- Legenda categorie in tutte le viste
- Overlap: appuntamenti stessa ora affiancati (50% larghezza ciascuno)
- Backend: auto-assign 2° operatore su conflitto

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza, spesa media, servizi piu richiesti)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore occupate
- P3: Confronto performance operatori

## Credenziali Test
- Preview: admin@brunomelito.it / mbhs637104
- Produzione: melitobruno@gmail.com / mbhs637104
