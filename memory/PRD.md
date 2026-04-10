# Bruno Melito Hair - PRD (Product Requirements Document)

## Problema Originale
App gestionale per salone parrucchiere (Bruno Melito Hair) con sito pubblico per prenotazioni e dashboard admin (CMS, Planning, Statistiche).

## Utente
Bruno Melito - Proprietario salone parrucchiere. Lingua: Italiano.
Account produzione: admin@brunomelito.it (NON melitobruno@gmail.com)

## Architettura
- **Frontend**: React (porta 3000) con Shadcn/UI
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB (locale preview / Atlas produzione)
- **Hosting**: Render (backend: bruno-melito-hair-2497.onrender.com)
- **Dominio**: brunomelitohair.it (OVH DNS)

## Funzionalità Completate

### Planning - Colori Multi-Servizio (10/04/2026)
- Ogni card appuntamento mostra TUTTI i colori dei servizi, non solo uno
- Barra colorata a sinistra con sezioni per ogni categoria servizio
- Pallini colorati accanto ai nomi dei servizi
- Legenda categorie: Taglio (blu), Piega (arancione), Trattamenti (ambra), Colore (verde), Permanente (viola), Stiratura (rosa), Abbonamenti (indaco), Altro (grigio)
- Auto-repair al login: corregge categorie VUOTE (non sovrascrive quelle impostate dall'utente)
- Funzione `getServiceColors()` centralizzata in categories.js
- Funziona su DayView e WeekView

### Gestionale (Admin)
- Login/Registrazione con JWT
- Planning giornaliero/settimanale/mensile con drag & drop
- Auto-assegnazione operatore per overlap
- Festività italiane sul calendario
- Blocco slot/giorni specifici
- Scheda clienti con storico, WhatsApp, import Excel
- Card/Abbonamenti e Avvisi Card
- Programma Fedeltà dinamico
- Promemoria WhatsApp batch (domani, inattivi, scadenza colore)
- Template ringraziamento post-incasso modificabile
- Promozioni
- Report Incassi / Registro Uscite / Riepilogo Giorno
- Gestione Servizi e Operatori
- Gestione Sito Web (CMS completo)
- Tema admin personalizzabile (colori/font)

### Sito Pubblico (/sito)
- Landing page con hero, servizi, gallery, recensioni
- Prenotazione online con upselling
- "Prenota di nuovo" da storico
- Fedeltà e promozioni sincronizzate
- Anti-duplicato clienti

## Credenziali
- Preview: melitobruno@gmail.com / mbhs637104
- Produzione: admin@brunomelito.it / mbhs637104

## Backlog Prioritizzato

### P1
- Dashboard statistiche clienti avanzate

### P2
- Scheda cliente con storico fotografico
- Auguri compleanno automatici

### P3
- Lista d'attesa intelligente
- Heat map ore occupate
- Confronto performance operatori

## Note Produzione
- "Clear build cache and deploy" su Render
- DB produzione su MongoDB Atlas
- Backend Render: https://bruno-melito-hair-2497.onrender.com
