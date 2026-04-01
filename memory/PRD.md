# Bruno Melito Hair - PRD

## Problema Originale
App gestionale per salone (Bruno Melito Hair) con sito pubblico prenotazioni e dashboard admin (CMS, Planning, Statistiche).

## Architettura
- Frontend: React + Shadcn/UI + date-fns
- Backend: FastAPI + MongoDB (Atlas in produzione, locale in preview)
- Deploy: Render (frontend + backend) + Custom Domain (brunomelitohair.it)
- DNS: OVH

## Funzionalita Completate
- Sistema di prenotazione pubblica con calcolo disponibilita (festivi, pausa pranzo)
- Planning giornaliero, settimanale, mensile con drag & drop
- Checkout avanzato (Contanti, POS, Sospesi, Abbonamenti)
- Programma fedelta
- CMS personalizzazione temi (variabili CSS dinamiche)
- WhatsApp batch reminders
- Gestione slot bloccati (CRUD + context menu)
- Festivita italiane evidenziate
- Upselling servizi post-prenotazione
- Hero image e slogan personalizzabili
- PWA Service Worker

## Bug Fix Critici (01/04/2026)
### Fix Orari Split (Pausa Pranzo)
- **Problema**: Il regex catturava solo il primo intervallo orario. Con orari tipo `08:00 - 13:00---14:00 - 19:00`, gli slot pomeridiani venivano completamente ignorati
- **File corretti**: `WebsitePage.jsx` (prenotazione pubblica) + `NewAppointmentDialog.jsx` (admin planning)
- **Soluzione**: Regex globale (/g) con loop `exec()` per catturare TUTTI gli intervalli
- **Miglioramenti aggiuntivi**: Buffer ridotto 30->15min, messaggi specifici (giorno chiuso vs orari terminati), bottone "Prenota per prossimo giorno", auto-avanzamento, matching giorni case-insensitive

## Task In Corso
- Nessuno (bug fix completato e testato)

## Task Futuri
- P1: Dashboard statistiche clienti (grafici frequenza, spesa media, servizi piu richiesti)
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore occupate
- P3: Confronto performance operatori

## Refactoring Necessario
- WebsitePage.jsx (1650+ righe) - separare in componenti (Hero, Services, Booking, Contact)
- PlanningPage.jsx (740+ righe) - estrarre calendar grid e helper

## Credenziali Test
- Preview: admin@brunomelito.it / mbhs637104
- Produzione: melitobruno@gmail.com / mbhs637104

## Note Importanti
- La produzione su Render richiede SEMPRE "Clear build cache and deploy"
- Il Service Worker puo servire versioni vecchie - ricordare all'utente di svuotare cache browser
- MongoDB Atlas usa chiavi estese (lunedi, martedi) mentre il default usa abbreviazioni (lun, mar) - il codice gestisce entrambi
