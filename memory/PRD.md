# Bruno Melito Hair - Salon Management App

## Problem Statement
Full-stack salon management app (React, FastAPI, MongoDB Atlas) for managing appointments, clients, services, subscriptions (Abbonamenti), promotions, and loyalty programs. Public website with online booking.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI + MongoDB Atlas
- **Hosting**: Render (production), Emergent (preview)
- **Object Storage**: Emergent LLM Key
- **Language**: Italian (all UI and communications)

## Code Structure
```
/app/
├── backend/
│   ├── routes/
│   │   ├── public.py (public endpoints, booking, object storage)
│   │   ├── appointments.py (CRUD, checkout, loyalty)
│   │   ├── reminders.py (WhatsApp logic)
│   ├── server.py, database.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── planning/
│   │   │   │   ├── NewAppointmentDialog.jsx (534 lines)
│   │   │   │   └── EditAppointmentDialog.jsx (623 lines)
│   │   │   └── website/
│   │   │       ├── BookingModal.jsx (public booking)
│   │   │       └── ManageAppointments.jsx
│   │   ├── pages/
│   │   │   ├── PlanningPage.jsx (1240 lines, refactored from 2571)
│   │   │   └── WebsitePage.jsx (dynamic colors)
│   │   └── utils/formatDate.js
```

## Implemented Features (All Complete)
- [x] Appointment management (CRUD, recurring, drag & drop)
- [x] Client management with notes and phone tracking
- [x] Services with categories and sort_order
- [x] Abbonamenti (Card Templates) - 6 real packages
- [x] Promozioni with free service tracking
- [x] Checkout with payment methods (cash, prepaid cards)
- [x] Loyalty points system with WhatsApp alerts
- [x] Review request via WhatsApp after checkout
- [x] Public website with online booking
- [x] Dynamic CSS color theming
- [x] Object Storage for media uploads
- [x] 2-column layout for booking/appointment dialogs
- [x] Operator conflict resolution with auto-assignment
- [x] Services sorted by sort_order in all views

## Recent Changes (2026-03-21)
### Bug Fixes
1. **Services order fixed** - Added `.sort("sort_order", 1)` to backend, assigned sort_order to 4 legacy services
2. **Abbonamenti visibility** - Moved to top of public booking modal with distinct purple styling
3. **Operator conflict** - Backend auto-assigns free operator when no preference; improved frontend partial-slot handling

### Refactoring
- **PlanningPage.jsx**: 2571 → 1240 lines (-52%)
- Extracted `NewAppointmentDialog.jsx` (534 lines)
- Extracted `EditAppointmentDialog.jsx` (623 lines)

## Key API Endpoints
- `POST /api/public/booking` - Create booking with auto-assign conflict resolution
- `GET /api/public/services` - Sorted by sort_order
- `GET /api/public/website` - Full website data including card_templates
- `POST /api/appointments/{id}/checkout` - Checkout with loyalty/promo

## DB Schema
- `card_templates`: {id, name, card_type, total_value, total_services, duration_months}
- `loyalty`: {client_id, user_id, points}
- `appointments`: {..., promo_id, card_id, card_template_id}
- `services`: {..., category, sort_order, price, duration}

## Backlog
- No pending tasks. All PRD features complete.
- Future consideration: Further component extraction from remaining large pages
