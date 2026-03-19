# Bruno Melito Hair Salon - PRD

## Original Problem Statement
Salon management application (React, FastAPI, MongoDB) deployed on Render. The app manages bookings, CMS content, and the public-facing website for a hair salon.

## Core Requirements
- Stable, fully functional salon management app
- CMS for site content, colors, and fonts
- Intuitive booking flow with occupied slot feedback
- Clean, modern homepage with booking in a modal
- SEO compliance (Google Search Console)
- Reliable deployment to Render

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn UI
- **Backend:** Python, FastAPI
- **Database:** MongoDB
- **Deployment:** Render
- **Domain:** brunomelitohair.it
- **Repository:** https://github.com/topapippo/bruno-melito-hair-

## What's Been Implemented

### Phase 1 - Previous Sessions
- Refactored WebsitePage.jsx into 8 section components (Navbar, Hero, Stats, About, CTA, Gallery, Reviews, Footer)
- Booking flow moved to modal overlay
- CMS enhanced with font size controls and 6 theme presets
- Improved "Slot Occupied" modal with alternative suggestions
- Promo click-to-apply with confirmation badge
- SEO fixes (sitemap, robots.txt, canonical URLs, redirects)
- Mobile UX fixes (login button visibility)

### Phase 2 - Mar 18, 2026
- **Deployment Fix:** Removed yarn.lock, standardized on npm with package-lock.json
- **Conflict Modal Bug Fix:** Fixed case-sensitive string comparison
- **Backend Enhancement:** POST /api/public/booking returns HTTP 409 with structured conflict data
- **Booking Modal Refactoring:** Extracted BookingModal.jsx and ManageAppointments.jsx from WebsitePage.jsx
- **Lazy Loading:** All admin pages use React.lazy() for code splitting
- **Date Formatting:** Standardized all dates to Italian dd/mm/yy format across 10+ pages
- **Recurring Appointments:** Added "Repeat" feature to client history dialog
- **Badge Removal:** Removed "Made with MBHS" badge

### Phase 3 - Mar 19, 2026
- **BookingModal Redesign (P0):** Complete mobile-first redesign with accordion-style service categories
- **PlanningPage Dialog Redesign (P1):** Applied same category-tabbed service selection
- **Animated Price Counter:** Real-time animated price on booking button
- **Progressive Service Numbering:** Automatic numbering within categories
- **Gallery Fix:** Shows ALL photos from CMS (no hardcoded limit)
- **Dashboard Link Fix:** Corrected broken navigation link
- **CSS Utility:** Added `.scrollbar-hide` class

### Phase 4 - Mar 19, 2026 (Dark Theme & Customization)
- **Complete Aesthetic Overhaul:** "Onyx & Gold" dark theme applied to entire app
- **Customizable Admin Navigation:** NavConfigurator allows moving modules between sidebar and dashboard
- **Nav Config Persistence:** Backend endpoints (GET/PUT /api/nav-config) save layout per user
- **Dark Theme Design System:** CSS variables in :root for full theming
- **Advanced CSS Animations:** Glassmorphism, gradient text, keyframe animations

### Verification - Mar 19, 2026
- **Testing Agent Iteration 9:** Backend 100% (15/15), Frontend 100%
- **No JavaScript errors, no SIGSEGV crashes**
- **Gallery .slice(0,16) limit removed** — now shows all photos
- **Fix "Gestione Sito" black page:** Path mismatch in navModules.js (`/website-admin` → `/gestione-sito`)

## Architecture
```
/app/frontend/src/
├── App.js                          (Router + lazy loading)
├── pages/
│   ├── WebsitePage.jsx             (main page orchestrator)
│   ├── PlanningPage.jsx            (calendar + appointment management)
│   ├── Dashboard.jsx               (dynamic module grid, dark theme)
│   └── [admin pages...]            (lazy loaded)
├── components/
│   ├── Layout.jsx                  (dynamic sidebar, dark theme)
│   ├── NavConfigurator.jsx         (layout customization UI)
│   └── website/
│       ├── BookingModal.jsx        (accordion services, animated price)
│       ├── ManageAppointments.jsx
│       ├── GallerySection.jsx      (all photos, no limit)
│       └── [other sections]
├── utils/
│   ├── navModules.js               (module definitions)
│   └── formatDate.js               (Italian date formatting)
└── index.css                       (dark theme design system)

/app/backend/
├── server.py
├── routes/
│   └── stats.py                    (nav-config endpoints)
├── models.py
├── database.py
└── auth.py
```

## Key API Endpoints
- GET /api/public/website - Public website data
- GET /api/public/busy-slots - Fetch occupied time slots
- POST /api/public/booking - Create booking (409 on conflict)
- GET /api/appointments - Fetch appointments by date
- POST /api/appointments - Create appointment
- PUT /api/appointments/:id - Update appointment
- GET /api/nav-config - Get user navigation layout
- PUT /api/nav-config - Save user navigation layout

## Prioritized Backlog

### P0
- (None - all P0 items completed)

### P1
- WhatsApp Business API integration for automatic appointment reminders
- User pushes to GitHub and redeploys on Render

### P2
- Drag-and-drop customization for public website sections
- Performance optimization (bundle analysis, code splitting)
- Investigate broken gallery image (5th position - external URL)

## Credentials
- **Production:** melitobruno@gmail.com / mbhs637104
- **Local Admin:** admin@brunomelito.it / Admin123!
