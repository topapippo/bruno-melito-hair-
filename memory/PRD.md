# Bruno Melito Hair - PRD

## CONFIGURAZIONE PRODUZIONE — NON MODIFICARE MAI
### ⚠️ ISTRUZIONI CRITICHE PER TUTTI GLI AGENTI ⚠️
**LEGGERE PRIMA DI QUALSIASI MODIFICA**

- **Repository GitHub UNICO:** `topapippo/bruno-melito-hair-` (branch: main)
- **Render Frontend:** `bruno-melito-hair.onrender.com` → Custom domain: `brunomelitohair.it`
- **Render Backend:** `bruno-melito-hair-2497.onrender.com`
- **Database:** MongoDB Atlas (NON localhost!)
- **Account Produzione:** `admin@brunomelito.it` / `mbhs637104`
- **UptimeRobot:** DEVE puntare a `https://bruno-melito-hair-2497.onrender.com/api/health`
- **DNS OVH:** brunomelitohair.it → CNAME verso Render

### REGOLE ASSOLUTE
1. **MAI** creare nuovi repository o servizi Render
2. **MAI** cambiare URL del backend nel frontend (.env o codice)
3. **MAI** toccare le credenziali di produzione senza motivo
4. **MAI** aggiungere endpoint admin/reset temporanei e lasciarli in produzione
5. **SEMPRE** usare `REACT_APP_BACKEND_URL` per le chiamate API
6. **SEMPRE** ricordare: Build command Render Frontend = `REACT_APP_BACKEND_URL=https://bruno-melito-hair-2497.onrender.com yarn build`
7. **SEMPRE** dopo Save to GitHub → Manual Deploy → **Clear build cache and deploy** (sia frontend che backend)

### VARIABILI RENDER BACKEND
```
MONGO_URL=<stringa Atlas dell'utente>
DB_NAME=mbhs
JWT_SECRET=mbhs-secret-key-2024-secure
CORS_ORIGINS=*
EMERGENT_LLM_KEY=<chiave emergent>
VAPID_PUBLIC_KEY=<chiave pubblica>
VAPID_PRIVATE_KEY=<chiave privata>
```

### VARIABILI RENDER FRONTEND (Build)
```
REACT_APP_BACKEND_URL=https://bruno-melito-hair-2497.onrender.com
```

---

## Architettura
- Frontend: React + craco (porta 3000)
- Backend: FastAPI + Python (porta 8001)
- Database: MongoDB Atlas (produzione) / localhost (sviluppo)
- Hosting: Render
- DNS: OVH → brunomelitohair.it

## Funzionalità Complete
- Login/Register admin
- Dashboard con statistiche (giornaliero, mensile, annuale)
- Planning giornaliero/settimanale/mensile (BRUNO + MBHS)
- Gestione servizi per categorie condivise
- Gestione clienti (166+)
- Prenotazione pubblica (/sito) con servizi progressivi per categoria
- Card/Abbonamenti/Prepagate
- Promozioni e programma fedeltà (5%=5pt, 10%=10pt, Omaggio=35pt)
- Report incassi e registro uscite
- Backup dati
- Push notifications (VAPID)
- Operatore alternativo su conflitto orario
- I Miei Appuntamenti (cliente verifica/modifica/annulla tramite telefono)
- CMS Editor completo (Generale, Layout, Aspetto, Servizi, Foto, Gallery, Recensioni, Orari)
- Upselling Servizi post-prenotazione
- Promemoria WhatsApp batch (24h, scadenza colore, clienti inattivi)
- Hero Customization (immagine, slogan, descrizione)
- Tema Gestionale personalizzabile (6 preset + colori/font custom)
- Blocco Orari (ricorrenti e singoli, visivi nel Planning)
- Festività Italiane nel Planning (12 festività + Pasqua mobile)

## Fix Applicati (Marzo 2026)
- Service Worker rimosso (causava cache vecchia sui dispositivi)
- Timeout API aumentato da 15s a 90s con retry automatico
- Endpoint /api/health per UptimeRobot
- Migrazione dati da account vecchio (melitobruno@gmail.com) a admin@brunomelito.it

## Backlog
- P1: Dashboard statistiche clienti (grafici frequenza visite, spesa media, servizi più richiesti)
- P2: Scheda cliente con storico foto tagli
- P2: Sconti/messaggi automatici compleanno
- P3: Lista d'attesa intelligente
- P3: Heat map ore più occupate
- P3: Confronto performance operatori

## Refactoring Necessario
- PlanningPage.jsx (>2500 righe) → suddividere in sotto-componenti
