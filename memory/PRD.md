# Bruno Melito Hair - Salon Management Application

## Original Problem Statement
Full-stack salon management application for Bruno Melito Hair salon in Santa Maria Capua Vetere, Italy. The application includes a public-facing website and an admin panel for managing appointments, clients, services, and business operations.

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Hosting:** Render (Static Site for frontend, Web Service for backend)
- **Theme:** Onyx & Gold dark theme

## Architecture

### Repositories
- **Active (Render connected):** github.com/signorfabozzi-glitch/BRUNO-MELITO-HAIR
- **Legacy:** github.com/topapippo/BRUNOMELITOHAIR

### Production URLs
- **Frontend:** brunomelitohair.it
- **Backend API:** bruno-melito-hair-2497.onrender.com

### Database
- **MongoDB Atlas Cluster:** cluster0.glbiffm.mongodb.net
- **Database Name:** mbhs

## Credentials
- **Admin Login:** admin@brunomelito.it / Admin123!

## Implemented Features

### Production Deployment (Completed)
- Recreated backend Web Service on Render
- Migrated local DB to MongoDB Atlas (232 documents)
- Fixed missing endpoints (/api/admin-theme, /api/nav-config, /api/payments)
- Health check endpoint at root /

### Admin Panel Features (Completed)
- Planning page with day/week/month views
- Drag & drop appointment management
- Client search with appointment history
- Recurring appointments
- Checkout/payment system (cash, prepaid cards)
- Loyalty points system with WhatsApp notifications
- Online booking notifications banner
- Back arrow navigation
- Scrollable/collapsible save dialog

### Public Website Features (Completed)
- PWA with install banner
- Floating WhatsApp button
- Scroll-to-top button
- Google Maps integration
- Reviews carousel
- Drag-and-drop section reordering
- Booking modal with services, operators, time slots

### Card Templates / Abbonamenti (Completed - March 21, 2026)
- **Public BookingModal:** Abbonamenti accordion section with purple color scheme (#A855F7)
  - Shows all card templates with name, price, services count, duration
  - Clients can select a card template during booking
  - Selection badge appears below the accordion
  - Card template info appears in step 3 riepilogo
  - Booking payload includes card_template_id
- **Admin PlanningPage:** 
  - "Card, Promo & Abbonamenti" collapsible section in new appointment dialog
  - Shows available card templates with price and details
  - Admin can pre-select a card template for checkout reference
  - Card template indicator shown in checkout mode
- **Backend:**
  - PublicBookingRequest model accepts promo_id and card_template_id
  - Appointment saves promo_id and card_template_id
  - /api/public/website returns card_templates array
  - /api/card-templates CRUD endpoints (auth required)

## Known Issues

### Repository Sync Issue
- Emergent pushes to `topapippo` repository
- Render deploys from `signorfabozzi-glitch` repository
- Manual updates required on signorfabozzi-glitch when code changes

### Data Loss from Fork
- Some gallery/about photos lost during container fork
- User should re-upload photos via admin panel

### Dynamic Colors (PAUSED)
- Public website theme colors not updating dynamically
- User paused this to save credits

### Cambia Operatore (P1)
- Backend already returns available_operators and alternative_slots in 409 conflict response
- Frontend handles the conflict overlay - needs verification

## Backlog / Next Steps
1. (P1) Fix "Cambia Operatore" conflict response verification
2. (P1) Re-investigate public website dynamic color changes
3. (P1) Implement Object Storage for media uploads (prevent data loss)
4. (P2) Set up UptimeRobot for Render
5. (P2) Investigate SIGSEGV browser crash in testing
