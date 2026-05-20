# Changelog
## Elan Greens — Main App

All notable changes to the main public app are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.0.0] — 2026-05-20

### Added
- **News tab** — curated positive plant & greenery news feed sourced from Google News RSS
  - Plant chips on articles that mention garden species → tap to plant detail page
  - Topic chips (🌳 Green Bengaluru / 🏘️ Community / 🌱 Native Plants) for community/landscaping articles
  - Geo tags (📍 Bengaluru / Karnataka / South India / India) based on article content
  - Recency + geo scoring: articles about Bengaluru ranked higher than national
  - Per-plant cap + horizontal diversity floor to ensure coverage spread
  - Suspense streaming — page shell instant, feed streams in
  - 24-hour RSS cache via `next: { revalidate }` at the fetch layer
  - 10 trusted whitelisted news sources seeded (The Better India, Mongabay India, The Wire Science, etc.)
- **Topic queries** — admin-configurable community/landscaping RSS queries (`news_topic_queries` table)
  - 8 seeded queries including "Bengaluru landscaping", "Lalbagh Bengaluru", "native plants Bangalore"
  - Topic chip display when no garden plant matched in article
- **Related species section** on plant detail page — linked plants with relationship labels
- **New plant fields** on detail page:
  - Conservation status (IUCN — colour-coded: Least Concern → green, Vulnerable → amber, Endangered → red)
  - Growth rate · Propagation methods · Habitat type · Foliage type (Evergreen/Deciduous)
  - iNaturalist global observation count (social-proof chip)
- **Zoomable images** — main hero photo and all sub-gallery images open in fullscreen lightbox
  - React Portal pattern (`createPortal` + `z-[9999]`) — sits above nav bars on mobile
  - Escape key + backdrop click to dismiss
  - Body scroll locked while open

### Changed
- **Full Material Design 3 visual redesign**:
  - Brand colour: `#2E7D32` → `#1A6B2B` forest green (M3 primary)
  - Fonts: Dancing Script + Inter → **Playfair Display** (display) + **Plus Jakarta Sans** (body)
  - All pages use M3 token system (`--md-primary`, `--md-surface-container-*`, `--md-elevation-*`)
  - Elevated cards with `shadow-elevation-1` hover → `elevation-3`
  - Tonal containers for info cards, CTAs, category labels
- **Navigation restructured**: 4 primary tabs — Plants · Map · News · About
  - Green Team moved from primary nav into About page (CTA card)
  - Bottom nav (mobile): M3 Navigation Bar with `secondary-container` active indicator pill
  - Top nav (desktop): scroll-aware — flat at top → elevated on scroll
- Plant filter chips: M3 style (outlined at rest → filled + SVG checkmark on active)
- Plant sort: M3 Segmented Button (A–Z / Z–A / Newest)
- Plant detail back button: M3 text button with SVG arrow

### Fixed
- Articles up to 2 years old appearing in news feed — added `after:YYYY-MM-DD` to all RSS queries + hard cutoff in code
- Image lightbox buried under nav bars on mobile — fixed with `createPortal` + `z-[9999]`

---

## [1.0.0] — 2026-04-20

### Added
- Plant listing page with search, filter by category/type/height/toxicity, and A–Z sort
- Plant detail page with hero image, 10-image gallery, ecology strip, and location map
- Leaflet.js mini-map on detail page showing all instances of a species within society
- Stats strip showing unique species count and total plant count
- Data freshness timestamp on home page
- Map page with society layout plan and Google Maps link
- Our Green Team tribute page
- About page with anonymous creator note
- Responsive design: mobile-first, works on Chrome Android, Safari iOS, Chrome Desktop
- TENTATIVE badge for AI-identified plant data pending verification
- Graceful "Photo not available" and "Not applicable" states for missing gallery images
