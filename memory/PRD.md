# Bruno Melito Hair - Salon Management Application

## Original Problem Statement
Full-stack salon management application for Bruno Melito Hair salon in Santa Maria Capua Vetere, Italy. Public-facing booking website + admin panel for managing appointments, clients, services, and business operations.

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas (cluster0.glbiffm.mongodb.net, DB: mbhs)
- **Hosting:** Render (Static Site for frontend, Web Service for backend)
- **Object Storage:** Emergent Object Storage (persistent media uploads)
- **Theme:** Onyx & Gold dark theme (dynamic via admin config)

## Credentials
- **Admin Login:** admin@brunomelito.it / Admin123!

## Implemented Features (All Complete)

### Core Platform
- Planning page with day/week/month views, drag & drop
- Client search with appointment history
- Recurring appointments, checkout/payment system
- Loyalty points system with WhatsApp notifications
- Online booking notifications banner
- Back arrow navigation, scrollable/collapsible dialogs
- Health check endpoint for UptimeRobot/Render
- GitHub repo sync (topapippo → signorfabozzi-glitch)

### Card Templates / Abbonamenti
- Public BookingModal: Abbonamenti accordion (purple #A855F7) with card templates
- Admin PlanningPage: "Card, Promo & Abbonamenti" section in new appointment dialog
- Backend: promo_id and card_template_id saved on appointments

### Horizontal Grid Layout
- Public BookingModal: widened to sm:max-w-4xl, services in 2-3 column grid per category
- Admin PlanningPage new dialog: widened to sm:max-w-[900px], same grid layout
- Admin edit dialog: widened to sm:max-w-[900px]

### Dynamic Colors
- CSS variables (--gold, --gold-dim, --border-gold, --cyan) set dynamically from config
- All website components updated from hardcoded #D4AF37 to var(--gold)
- primary_color from admin config applies across entire public website

### Object Storage
- EMERGENT_LLM_KEY configured for Emergent Object Storage
- Upload endpoint: /api/website/upload (auth required)
- Serve endpoint: /api/website/files/{id} (public)
- Remote persistent storage prevents data loss on container restart

### Cambia Operatore
- Conflict detection excludes cancelled appointments
- Backend 409 response includes available_operators and alternative_slots
- Frontend conflict overlay with operator + time alternatives

### Infrastructure
- UptimeRobot health check endpoint configured
- GitHub repository synced to Render
- SIGSEGV: known headless browser testing environment issue, not app bug
