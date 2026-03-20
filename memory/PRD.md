# Bruno Melito Hair - Salon Management Application

## Original Problem Statement
Full-stack salon management application for Bruno Melito Hair salon in Santa Maria Capua Vetere, Italy. The application includes a public-facing website and an admin panel for managing appointments, clients, services, and business operations.

## Tech Stack
- **Frontend:** React with Tailwind CSS, Shadcn/UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Hosting:** Render (Static Site for frontend, Web Service for backend)
- **Theme:** Onyx & Gold dark theme

## Current State (March 20, 2026)

### ✅ COMPLETED - Production Deployment Fixed
- Recreated backend Web Service on Render
- Configured environment variables (MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS)
- Migrated 232 documents from Emergent local MongoDB to MongoDB Atlas:
  - 173 clients
  - 21 services
  - 7 promotions
  - 6 reviews
  - 5 appointments
  - Website configuration, gallery, templates, etc.

### ✅ COMPLETED - Critical Bug Fixes
- Added missing `/api/admin-theme` endpoint for saving admin panel appearance
- Added missing `/api/nav-config` endpoint for saving sidebar customization
- Added `/api/payments` endpoint
- Added health check endpoint at root `/` for Render
- Manually updated `backend/routes/stats.py` on GitHub (signorfabozzi-glitch repo)

### ✅ PREVIOUSLY COMPLETED Features
- PWA (Progressive Web App) with install banner
- Floating WhatsApp button
- Scroll-to-top button
- Google Maps integration
- Reviews carousel
- Drag-and-drop section reordering
- Settings page crash fix
- Dark theme contrast/readability fixes

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

## Known Issues

### Repository Sync Issue
- Emergent pushes to `topapippo` repository
- Render deploys from `signorfabozzi-glitch` repository
- Manual updates required on signorfabozzi-glitch when code changes are made

### Data Loss from Fork
- Some photos were lost during fork (had 20+ gallery photos, now 4)
- 7 "About Us" photos were lost
- User should re-upload photos via admin panel

## Credentials
- **Admin Login:** admin@brunomelito.it / Admin123!

## Next Steps / Backlog
1. Re-upload lost gallery photos (user task)
2. Resolve repository sync issue between topapippo and signorfabozzi-glitch
3. Set up UptimeRobot or similar to prevent Render free tier spin-down
4. Investigate SIGSEGV browser crash (potential CSS animation issue)
