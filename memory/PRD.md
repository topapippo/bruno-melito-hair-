# Bruno Melito Hair - PRD

## Problema Originale
App gestionale per salone (Bruno Melito Hair) con sito pubblico prenotazioni e dashboard admin (CMS, Planning, Statistiche).

## Architettura
- Frontend: React + Shadcn/UI + date-fns
- Backend: FastAPI + MongoDB (Atlas in produzione, locale in preview)
- Deploy: Render (frontend + backend) + Custom Domain (brunomelitohair.it)
- DNS: OVH

## Funzionalita Completate
- Sistema di prenotazione pubblica con calcolo disponibilita (festivi, pausa pranzo, orari split)
- Planning giornaliero con drag & drop e colonne operatori
- **Planning settimanale con griglia 15min, drag & drop tra giorni, colori operatori** (02/04/2026)
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

## Bug Fix Critici (01-02/04/2026)
### Fix Orari Split (Pausa Pranzo)
- **Problema**: Il regex catturava solo il primo intervallo orario (`08:00-13:00`), ignorando `14:00-19:00`
- **File corretti**: WebsitePage.jsx + NewAppointmentDialog.jsx
- **Soluzione**: Regex globale (/g) con loop exec() per tutti gli intervalli

### Vista Settimanale Completa (02/04/2026)
- **Problema**: Nessuna griglia oraria, no drag&drop, solo 1 operatore
- **Soluzione**: Riscrittura completa WeekView.jsx con griglia 15min, drag&drop, legenda operatori

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza, spesa media, servizi piu richiesti)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore occupate
- P3: Confronto performance operatori

## Refactoring Necessario
- WebsitePage.jsx (1650+ righe) - separare in componenti (Hero, Services, Booking, Contact)
- PlanningPage.jsx (750+ righe) - estrarre helper functions

## Credenziali Test
- Preview: admin@brunomelito.it / mbhs637104
- Produzione: melitobruno@gmail.com / mbhs637104
- Produzione API: https://bruno-melito-hair-2497.onrender.com/api

## Note Importanti
- La produzione su Render richiede SEMPRE "Clear build cache and deploy"
- Il Service Worker puo servire versioni vecchie - ricordare all'utente di svuotare cache browser
- MongoDB Atlas usa chiavi estese (lunedi, martedi) - il codice gestisce entrambi i formati
- Gli orari di produzione usano formato split "08:00 - 13:00---14:00 - 19:00"
