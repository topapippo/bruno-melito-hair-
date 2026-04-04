# Bruno Melito Hair - PRD (Product Requirements Document)

## Problema Originale
App gestionale per salone parrucchiere (Bruno Melito Hair) con sito pubblico per prenotazioni e dashboard admin (CMS, Planning, Statistiche).

## Utente
Bruno Melito - Proprietario salone parrucchiere. Lingua: Italiano.

## Architettura
- **Frontend**: React (porta 3000) con Shadcn/UI
- **Backend**: FastAPI (porta 8001)
- **Database**: MongoDB (locale preview / Atlas produzione)
- **Hosting**: Render
- **Dominio**: brunomelitohair.it (OVH DNS)

## Funzionalità Completate

### Gestionale (Admin)
- Login/Registrazione con JWT
- Planning giornaliero/settimanale/mensile con drag & drop
- Appuntamenti con colori per categoria servizio
- Auto-assegnazione operatore per overlap
- Festività italiane sul calendario
- Blocco slot/giorni specifici
- Scheda clienti con storico, WhatsApp, import Excel
- Card/Abbonamenti e Avvisi Card
- Programma Fedeltà dinamico
- Promemoria WhatsApp batch (domani, inattivi, scadenza colore)
- **Template ringraziamento post-incasso modificabile** (04/04/2026)
- Promozioni
- Report Incassi / Registro Uscite / Riepilogo Giorno
- Gestione Servizi e Operatori
- Gestione Sito Web (CMS completo con temi, hero, gallery, recensioni, orari)
- **Sincronizzazione automatica servizi gestionale ↔ sito pubblico** (04/04/2026)
- Tema admin personalizzabile (colori/font)

### Sito Pubblico (/sito)
- Landing page con hero, chi siamo, servizi, gallery, recensioni, orari
- Sistema prenotazione online con selezione servizi multipli
- Upselling post-prenotazione
- "Prenota di nuovo" da storico appuntamenti
- Sezione fedeltà dinamica dal CMS
- **Anti-duplicato clienti** (04/04/2026): prenotazione online riconosce clienti esistenti per telefono normalizzato o nome

### Bug Fix (04/04/2026)
- **Storico cliente "ERRORE CARICAMENTO"** → Creati endpoint `GET /api/clients/{id}/history` e `GET /api/clients/{id}/whatsapp`
- **Duplicazione clienti da prenotazione online** → Implementata normalizzazione telefono e ricerca intelligente per evitare duplicati

## Credenziali Test
- Email: melitobruno@gmail.com
- Password: mbhs637104

## Backlog Prioritizzato

### P1 - Alta Priorità
- Dashboard statistiche clienti avanzate (grafici frequenza visite, spesa media, servizi più richiesti)

### P2 - Media Priorità
- Scheda cliente con storico fotografico (foto tagli precedenti)
- Auguri compleanno automatici / sconti

### P3 - Bassa Priorità
- Lista d'attesa intelligente (notifica slot libero)
- Heat map ore più occupate
- Confronto performance operatori

## Note Produzione
- Sempre fare "Clear build cache and deploy" su Render
- Il DB di produzione è su MongoDB Atlas (NON il locale)
