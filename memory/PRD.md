# Bruno Melito Hair Salon - PRD

## Project Overview
Full-stack salon management app (React + FastAPI + MongoDB Atlas) deployed on Render.
- Frontend: Render Static Site (root: `mbhs/frontend`)
- Backend: Render Web Service (root: `mbhs/backend`)
- Database: MongoDB Atlas

## CRITICAL: Two Codebases
- `/app/frontend/` + `/app/backend/` → Preview environment (Emergent)
- `/app/mbhs/frontend/` + `/app/mbhs/backend/` → PRODUCTION (Render)
- **ALL production changes MUST go in `/app/mbhs/`**

## Architecture
- Backend: FastAPI + Motor (MongoDB async)
- Frontend: React (CRA via craco) + Tailwind + shadcn/ui
- Auth: JWT-based
- Storage: Emergent Object Storage (via direct HTTP requests)

## Key API Endpoints (Production)
- `GET /api/public/website` → salon config, services, card_templates, loyalty
- `POST /api/public/booking` → create booking (with 409 conflict + alternatives)
- `GET /api/public/operators` → active operators
- `GET /api/public/services` → all services
- `GET /api/public/promotions/all` → active promotions

## Recent Changes (2026-03-21)
### Session 1 (Preview codebase /app/)
- Refactored PlanningPage.jsx (2500+ → 1240 lines)
- Push Notifications (VAPID, service worker, backend scheduler)
- Card templates in BookingModal.jsx

### Session 2 (Production codebase /app/mbhs/)
- **Backend**: Added card_templates to /api/public/website response
- **Backend**: Booking conflict resolution with 409 + available operators + alternative slots
- **Frontend**: Services grouped by category in booking form
- **Frontend**: Card templates ("Abbonamenti & Card") section in booking
- **Frontend**: Time slots respect admin hours (closed days blocked)
- **Frontend**: Conflict panel with alternative operators/times
- **WeeklyView**: 7 days (Mon-Sun) instead of 6
- **Build fix**: CI=false in .env to prevent eslint warnings blocking Render build

## Admin Credentials
- Email: admin@brunomelito.it / melitobruno@gmail.com

## Backlog
- Verify Render deployment after latest changes
- Dashboard content editing verification (may already work)
- Client statistics dashboard (charts)
