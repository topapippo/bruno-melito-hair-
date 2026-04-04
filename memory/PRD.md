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
- Template ringraziamento post-incasso modificabile
- Promozioni
- Report Incassi / Registro Uscite / Riepilogo Giorno
- Gestione Servizi e Operatori
- Gestione Sito Web (CMS completo) con:
  - Generale, Layout, Aspetto, Servizi (sync), Foto Salone, Gallery, Recensioni
  - Upselling, **Fedeltà** (sync con sito), **Promozioni** (CRUD), Orari & Contatti
- Tema admin personalizzabile (colori/font)

### Sito Pubblico (/sito)
- Landing page con hero, chi siamo, servizi, gallery, recensioni, orari
- Sistema prenotazione online con selezione servizi multipli
- Upselling post-prenotazione
- "Prenota di nuovo" da storico appuntamenti
- Sezione fedeltà dinamica **sincronizzata con gestionale**
- Sezione promozioni **sincronizzata con gestionale**
- Anti-duplicato clienti (normalizzazione telefono + match nome)

### Bug Fix (04/04/2026)
- Storico cliente "ERRORE CARICAMENTO" → Creati endpoint history e whatsapp
- Duplicazione clienti da prenotazione online → Normalizzazione telefono
- Messaggio ringraziamento non partiva → Checkout ora recupera telefono dal cliente
- Template ringraziamento non appariva in produzione → Auto-creazione se mancante
- **Sync fedeltà gestionale ↔ sito** → Endpoint pubblico usa stessa fonte dati admin
- **Gestione Sito completa** → Aggiunti tab Fedeltà e Promozioni

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
