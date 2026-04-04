# Bruno Melito Hair — PRD

## Problema Originale
App gestionale completa per salone (Bruno Melito Hair) con sito pubblico per prenotazioni e dashboard admin.

## Architettura
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Deploy**: Render + MongoDB Atlas + OVH
- **Dominio**: brunomelitohair.it
- **GitHub**: topapippo/bruno-melito-hair-

## Funzionalità Completate
- Landing page pubblica con sezioni dinamiche CMS
- Booking online 3 step con upselling
- Planning giornaliero/settimanale/mensile con drag & drop
- Colori per categoria servizi con triple-fallback
- Split overlap appuntamenti
- Auto-assegnazione 2° operatore con time-range overlap
- Messaggio ringraziamento WhatsApp post-incasso
- "Prenota di nuovo" nello storico appuntamenti
- **Sezione Fedeltà dinamica** — legge premi e punti_per_euro dal DB (modificabili da Gestione Sito)
- Gestione blocco slot orari, festività italiane
- CMS temi dinamici, WhatsApp batch reminders
- Programma fedeltà, Card/Abbonamenti, QR Code
- Refactoring: WebsitePage e PlanningPage suddivisi in componenti

## Note Tecniche
- Split Hours: `---` come delimitatore
- Legacy Color Fallback: svcById + svcByName
- Render Deploy: SEMPRE Clear build cache!

## Task Futuri
- P1: Dashboard statistiche clienti
- P2: Scheda cliente con storico fotografico
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori
