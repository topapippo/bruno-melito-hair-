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

## Implemented Features

### Core Platform
- Planning page with day/week/month views, drag & drop
- Client search with appointment history
- Recurring appointments, checkout/payment system
- Loyalty points system with WhatsApp notifications
- Online booking notifications banner
- Back arrow navigation, scrollable/collapsible dialogs

### Card Templates / Abbonamenti (March 21, 2026)
- Public BookingModal: Abbonamenti accordion (purple #A855F7) with card templates
- Admin PlanningPage: "Card, Promo & Abbonamenti" section in new appointment dialog
- Backend: promo_id and card_template_id saved on appointments

### Horizontal Grid Layout (March 21, 2026)
- Public BookingModal: widened to sm:max-w-4xl, services in 2-3 column grid per category
- Admin PlanningPage new dialog: widened to sm:max-w-[900px], same grid layout
- Admin edit dialog: widened to sm:max-w-[900px]

### Dynamic Colors (March 21, 2026)
- CSS variables (--gold, --gold-dim, --border-gold, --cyan) set dynamically from config
- All website components updated from hardcoded #D4AF37 to var(--gold)
- primary_color from admin config applies across entire public website

### Object Storage (March 21, 2026)
- EMERGENT_LLM_KEY configured for Emergent Object Storage
- Upload endpoint: /api/website/upload (auth required)
- Serve endpoint: /api/website/files/{id} (public)
- Remote persistent storage prevents data loss on container restart

### Cambia Operatore Fix (March 21, 2026)
- Conflict detection excludes cancelled appointments (status != cancelled)
- Backend 409 response includes available_operators and alternative_slots
- Frontend conflict overlay shows operator alternatives and time alternatives

## Known Issues
### Repository Sync
- Emergent pushes to `topapippo` repo, Render deploys from `signorfabozzi-glitch`
- Manual sync required

### Data Loss from Fork
- Some gallery/about photos lost during container fork
- User can now re-upload via admin panel (persistent Object Storage)

## Backlog
1. (P2) Set up UptimeRobot for Render
2. (P2) Investigate SIGSEGV browser crash in automated testing
3. (P2) Sync GitHub repositories
