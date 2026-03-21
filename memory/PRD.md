# Bruno Melito Hair - Salon Management Application

## Original Problem Statement
Full-stack salon management application for Bruno Melito Hair salon. Public-facing booking website + admin panel for managing appointments, clients, services, and business operations.

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Hosting:** Render
- **Object Storage:** Emergent Object Storage
- **Theme:** Onyx & dynamic colors (configurable from admin)

## Credentials
- **Admin Login:** admin@brunomelito.it / Admin123!

## All Implemented Features

### Core Platform
- Planning page (day/week/month views, drag & drop)
- Client management with appointment history
- Recurring appointments, checkout/payment system
- Loyalty points with WhatsApp notifications
- Online booking notifications banner
- Health check endpoint for UptimeRobot/Render

### Card Templates / Abbonamenti
- Public BookingModal: Abbonamenti accordion (purple)
- Admin PlanningPage: "Card, Promo & Abbonamenti" in dialog
- Backend: promo_id and card_template_id on appointments

### Layout & UI
- Wider modals (4xl public, 900px admin)
- Horizontal 3-column grid for services per category
- Dynamic colors from admin config (CSS variables override)
- All components use var(--gold) instead of hardcoded colors

### Object Storage
- Persistent remote file storage (EMERGENT_LLM_KEY)
- Upload/serve endpoints

### Cambia Operatore
- Conflict detection excludes cancelled appointments
- 409 response with available_operators and alternative_slots

### WhatsApp Reminders & Notifications (Complete)
- **Promemoria domani**: Lista appuntamenti domani con invio rapido WhatsApp
- **Invio batch**: Un click per inviare tutti i promemoria via WhatsApp
- **Clienti inattivi**: Richiamo automatico clienti assenti 60+ giorni
- **Scadenza colore**: Avviso clienti con colore scaduto 30+ giorni
- **Template messaggi personalizzabili**: Con variabili {nome}, {ora}, {servizi}, {giorni}
- **Auto-check reminder**: Banner nella PlanningPage con conteggio pendenti
- **Post-checkout review request**: Dialog WhatsApp dopo il pagamento per chiedere recensione
- **Loyalty threshold alert**: Dialog WhatsApp quando cliente raggiunge soglia punti

### Infrastructure
- GitHub repo synced to Render
- UptimeRobot health check
