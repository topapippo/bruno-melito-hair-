# Bruno Melito Hair - PRD

## Problema Originale
App gestionale per salone parrucchiere con sito pubblico per prenotazioni e dashboard admin.

## Utente
Bruno Melito. Lingua: Italiano. Account produzione: admin@brunomelito.it

## Architettura
- Frontend: React (porta 3000), Backend: FastAPI (porta 8001), DB: MongoDB
- Hosting: Render (bruno-melito-hair-2497.onrender.com)
- Dominio: brunomelitohair.it

## Funzionalità Completate

### Planning - Card Multi-Colore (10/04/2026)
- Card con sfondo BIANCO neutro (non più un singolo colore)
- Barra colorata a sinistra (6px) divisa in sezioni per ogni servizio
- Ogni servizio mostrato come BADGE COLORATO con il colore della categoria
- Es: Taglio (blu) + Piega (arancione) + Colore (verde) + Trattamento (ambra) = 4 badge distinti
- Funziona su DayView e WeekView
- Auto-repair al login corregge solo categorie VUOTE (non sovrascrive esistenti)
- Categorie: Taglio, Piega, Trattamenti, Colore, Permanente, Stiratura, Abbonamenti, Altro

### Altre funzionalità completate
- Login/JWT, Planning giornaliero/settimanale/mensile con drag & drop
- Festività italiane, Blocco slot, Scheda clienti, WhatsApp batch
- Programma Fedeltà, Promozioni, Report Incassi
- CMS completo, Tema admin personalizzabile
- Sito pubblico con prenotazione online, upselling, anti-duplicato

## Credenziali
- Preview: melitobruno@gmail.com / mbhs637104
- Produzione: admin@brunomelito.it / mbhs637104

## Backlog
- P1: Dashboard statistiche clienti avanzate
- P2: Scheda cliente con storico fotografico
- P2: Auguri compleanno automatici
- P3: Lista d'attesa / Heat map / Performance operatori
