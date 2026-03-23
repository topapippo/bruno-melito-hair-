# Bruno Melito Hair Salon - PRD

## Project Overview
Full-stack salon management app (React + FastAPI + MongoDB Atlas) deployed on Render.
- Frontend: Render Static Site (root: `mbhs/frontend`)
- Backend: Render Web Service (root: `mbhs/backend`)
- Database: MongoDB Atlas

## UNIFIED CODEBASE (2026-03-23)
- `/app/frontend/` → symlink to `/app/mbhs/frontend/`
- `/app/backend/` → symlink to `/app/mbhs/backend/`
- **Single codebase**: all changes go to `/app/mbhs/`
- Preview and Production use the SAME code

## Architecture
- Backend: FastAPI + Motor (MongoDB async) + pywebpush
- Frontend: React (CRA via craco) + Tailwind + shadcn/ui
- Auth: JWT-based
- Storage: Emergent Object Storage (via direct HTTP requests)
- Push Notifications: VAPID keys + Service Worker

## Key API Endpoints
- `GET /api/public/website` → config, services, card_templates, loyalty
- `POST /api/public/booking` → create booking (409 conflict + alternatives)
- `GET /api/public/operators` → active operators
- `GET /api/public/services` → all services
- `GET /api/public/promotions/all` → active promotions
- `GET /api/push/vapid-key` → VAPID public key
- `POST /api/push/subscribe` → register push subscription

## Completed Features
1. Admin Planning page (refactored)
2. Admin sidebar with all sections
3. Public website with booking form
4. Services grouped by category in booking
5. Card templates (6) in booking ("Abbonamenti & Card")
6. Promozioni in booking
7. Booking conflict resolution (409 + alternative operators/times)
8. Weekly view (7 days Mon-Sun)
9. Time slots respect admin hours (closed days blocked)
10. Push notifications (VAPID + service worker + scheduler)
11. WebsiteAdminPage fixed (auth interceptor)
12. Codebase unified (symlinks)

## Admin Credentials
- Email: admin@brunomelito.it
- Password: admin123

## Backlog
- Dashboard statistiche clienti
- Verify all admin pages work with unified codebase
