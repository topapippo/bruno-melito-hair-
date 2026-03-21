# Bruno Melito Hair - Salon Management App

## Problem Statement
Full-stack salon management app (React, FastAPI, MongoDB Atlas) for managing appointments, clients, services, subscriptions (Abbonamenti), promotions, and loyalty programs. Public website with online booking.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI + MongoDB Atlas
- **Hosting**: Render (production), Emergent (preview)
- **Object Storage**: Emergent LLM Key
- **Push Notifications**: Web Push API (VAPID keys, pywebpush)
- **Language**: Italian (all UI and communications)

## Code Structure
```
/app/
├── backend/
│   ├── routes/
│   │   ├── public.py (public endpoints, booking, object storage)
│   │   ├── appointments.py (CRUD, checkout, loyalty)
│   │   ├── reminders.py (WhatsApp logic)
│   │   ├── push.py (push notification subscribe, send-reminders)
│   ├── server.py (background scheduler for push reminders)
│   └── database.py
├── frontend/
│   ├── public/sw-push.js (service worker for push)
│   ├── src/
│   │   ├── components/
│   │   │   ├── planning/
│   │   │   │   ├── NewAppointmentDialog.jsx
│   │   │   │   └── EditAppointmentDialog.jsx
│   │   │   └── website/
│   │   │       ├── BookingModal.jsx (public booking, Abbonamenti grid)
│   │   │       └── ManageAppointments.jsx
│   │   ├── pages/
│   │   │   ├── PlanningPage.jsx (1240 lines, refactored)
│   │   │   └── WebsitePage.jsx (push init after booking)
│   │   └── utils/
│   │       ├── formatDate.js
│   │       └── pushNotifications.js
```

## Implemented Features (All Complete)
- [x] Appointment management (CRUD, recurring, drag & drop)
- [x] Client management with notes and phone tracking
- [x] Services with categories and sort_order
- [x] Abbonamenti (Card Templates) - 6 real packages, grid layout on public + admin
- [x] Promozioni with free service tracking
- [x] Checkout with payment methods (cash, prepaid cards)
- [x] Loyalty points system with WhatsApp alerts
- [x] Review request via WhatsApp after checkout
- [x] WhatsApp reminder notifications
- [x] **Push Notifications** - automatic reminders 24h before appointments
- [x] Public website with online booking
- [x] Dynamic CSS color theming
- [x] Object Storage for media uploads
- [x] 2-column layout for booking/appointment dialogs
- [x] Operator conflict resolution with auto-assignment
- [x] Services sorted by sort_order in all views

## Recent Changes (2026-03-21)
### New Features
1. **Push Notifications** - VAPID keys, service worker, backend scheduler (hourly check), auto-subscribe after booking
2. **Abbonamenti inside ABBONAMENTO tab** - 6 card templates (subscriptions + prepaid) displayed inside the "Abbonamento" service category accordion with detailed layout (name, type, price, duration, notes). Separate "Abbonamenti & Card" accordion removed.

### Bug Fixes (from earlier this session)
1. Services order fixed (sort_order ascending)
2. Abbonamenti moved inside ABBONAMENTO tab per user request
3. Operator conflict (auto-assign free operator)

### Refactoring
- PlanningPage.jsx: 2571 → 1240 lines (-52%)
- Extracted NewAppointmentDialog.jsx and EditAppointmentDialog.jsx

## Key API Endpoints
- `POST /api/public/booking` - Create booking with auto-assign
- `GET /api/push/vapid-key` - Get VAPID public key
- `POST /api/push/subscribe` - Register push subscription
- `POST /api/push/send-reminders` - Send push reminders (also runs hourly)

## Backlog
- Render deployment verification (user must confirm deploy works)
- Client statistics dashboard (charts: visit frequency, avg spend, top services)
