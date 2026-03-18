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
- **Frontend:** React, Tailwind CSS, Yarn
- **Backend:** Python, FastAPI
- **Database:** MongoDB
- **Deployment:** Render
- **Domain:** brunomelitohair.it
- **Repository:** https://github.com/topapippo/bruno-melito-hair-

## What's Been Implemented
- Refactored WebsitePage.jsx into 8 smaller components (Navbar, Hero, Stats, About, CTA, Gallery, Reviews, Footer)
- Booking flow moved to modal overlay
- CMS enhanced with font size controls and 6 theme presets
- Improved "Slot Occupied" modal with alternative suggestions
- Promo click-to-apply with confirmation badge
- SEO fixes (sitemap, robots.txt, canonical URLs, redirects)
- Mobile UX fixes (login button visibility)
- UI cleanup (footer branding, admin back button)

## Deployment Fix (Feb 2026)
- Verified yarn.lock is synced with package.json
- package-lock.json already removed
- User needs to push to GitHub and redeploy on Render

## Prioritized Backlog
### P0
- User pushes to GitHub and redeploys on Render
- Full verification of all features on live site

### P1
- Make GitHub repository private + add Render collaborator

### P2
- Performance optimization (lazy loading, bundle analysis)
- Booking modal refactoring into sub-components

## Credentials
- **Production:** melitobruno@gmail.com / mbhs637104
- **Local:** admin@brunomelito.it / Admin123!

## Key API Endpoints
- GET /api/public/busy-slots - Fetch occupied time slots
- PUT /api/website - Save CMS data (font_size, title_size)
- GET /api/public/website - Public website data
