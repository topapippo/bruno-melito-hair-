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

### Phase 1 - Initial Build
- Refactored WebsitePage.jsx into 8 section components (Navbar, Hero, Stats, About, CTA, Gallery, Reviews, Footer)
- Booking flow moved to modal overlay
- CMS enhanced with font size controls and 6 theme presets
- Improved "Slot Occupied" modal with alternative suggestions
- Promo click-to-apply with confirmation badge
- SEO fixes (sitemap, robots.txt, canonical URLs, redirects)
- Mobile UX fixes (login button visibility)

### Phase 2 - Mar 18, 2026
- Deployment Fix, Conflict Modal Bug Fix, Backend HTTP 409 conflict response
- BookingModal/ManageAppointments extraction, Lazy Loading, Date Formatting
- Recurring Appointments, Badge Removal

### Phase 3 - Mar 19, 2026
- BookingModal accordion-style service categories
- PlanningPage accordion service selection
- Animated Price Counter, Progressive Service Numbering
- Gallery shows ALL photos (no limit), Dashboard Link Fix

### Phase 4 - Mar 19, 2026 (Dark Theme)
- Complete "Onyx & Gold" dark theme for entire app
- Customizable Admin Navigation (NavConfigurator)
- CSS Design System with variables, glassmorphism, keyframe animations

### Phase 5 - Mar 19, 2026 (Current)
- **BookingModal dark theme:** Full rewrite with CSS variables (--bg-card, --gold, etc.)
- **Button animations:** btn-gold (glow + shine), btn-animate (radial + lift), btn-glass, dash-card
- **Gestione Sito fix:** Path corrected /website-admin → /gestione-sito, 37+ colors converted
- **Section reorder:** New "Ordine Sezioni" tab with up/down arrows, backend persistence
- **Dynamic section rendering:** WebsitePage uses sectionMap/sectionOrder from config
- **Success page + mobile CTA:** Converted to dark theme
- **Performance optimization:** Build fix, image lazy loading, prefers-reduced-motion, will-change, content-visibility
- **Refactoring:** Cleaned 19 old test files (24→5), verified production build compiles
- **Dark theme batch fix:** 23 admin pages converted from light to dark theme (sed batch replace)
- **Admin appearance customization ("Aspetto Gestionale"):** New section in Settings with color pickers, font selector (6 options), font size (4 options), border radius (5 options), save/reset functionality
- **Admin theme API:** New GET/PUT /api/admin-theme endpoints for persistence in MongoDB
- **Theme auto-load:** Admin theme preferences loaded at startup in Layout.jsx
- **Testing:** Backend 12/12, Frontend 16/16 (iteration_11)
- **Settings page fix:** toggleDay crash fix, Checkbox onCheckedChange + stopPropagation
- **Pending bookings endpoint:** Created GET /api/appointments/pending-bookings and PUT /api/booking/{id}/confirm
- **PendingBookings.jsx:** Rewritten with dark theme

## Architecture
```
/app/frontend/src/
├── App.js                          (Router + lazy loading)
├── index.css                       (Dark theme design system + button animations)
├── pages/
│   ├── WebsitePage.jsx             (dynamic section order from config)
│   ├── WebsiteAdminPage.jsx        (CMS + new "Ordine Sezioni" tab)
│   ├── PlanningPage.jsx            (calendar + accordion services)
│   ├── Dashboard.jsx               (dynamic modules, dash-card class)
│   └── [admin pages...]            (lazy loaded)
├── components/
│   ├── Layout.jsx                  (dynamic sidebar, dark theme)
│   ├── NavConfigurator.jsx         (layout customization UI)
│   └── website/
│       ├── BookingModal.jsx        (dark theme, accordion, animated price)
│       ├── HeroSection.jsx         (btn-gold class)
│       ├── CTASection.jsx          (btn-gold + btn-animate)
│       ├── Navbar.jsx              (btn-gold class)
│       ├── GallerySection.jsx      (all photos, no limit)
│       └── [other sections]
├── utils/
│   ├── navModules.js               (/gestione-sito path fixed)
│   └── formatDate.js               (Italian date formatting)

/app/backend/
├── server.py
├── routes/
│   ├── public.py                   (website config supports section_order)
│   └── stats.py                    (nav-config endpoints)
├── models.py, database.py, auth.py
```

## Key API Endpoints
- GET /api/public/website - Public website data (includes section_order)
- PUT /api/website/config - Save CMS config (including section_order)
- GET /api/nav-config - User navigation layout
- PUT /api/nav-config - Save navigation layout
- POST /api/public/booking - Create booking (409 on conflict)

## Prioritized Backlog

### P0 - None (all completed)

### P1
- WhatsApp Business API integration for automatic appointment reminders
- Deploy to Render with latest changes

### P2
- Performance optimization (bundle analysis, lazy image loading)
- Advanced drag-and-drop for section reorder (currently uses arrows)

### P3
- Refactoring backend structure
- Progressive Web App features

## Credentials
- **Production:** melitobruno@gmail.com / mbhs637104
- **Local Admin:** admin@brunomelito.it / Admin123!
