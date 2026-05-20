# Product Requirements Document
## Elan Greens — Society Plant Directory
### Version 3.0 | May 2026

> **This document supersedes PRD-v2.0.md.**
> PRD-v2.0.md is retained as a historical artifact.
> Section 9 (Version History) documents the delta from v2.0 → v3.0.

---

## 1. Overview

A mobile-first web app for residents of **Divyasree Elan Homes** (Sarjapur Road,
Bellandur, Bengaluru — 560035) to explore the trees, plants, shrubs, and creepers
maintained within the society grounds.

Secondary audience: residents of nearby gated societies curious about urban greenery.

The app is a tribute to the society's dedicated gardening and maintenance staff, and
a resource to help residents connect with the vibrant green life around them.

---

## 2. App Identity

| Attribute | Value |
|-----------|-------|
| Name | Elan Greens |
| Logo | *"élan"* wordmark in Playfair Display font, colour `#1A6B2B` |
| Brand colour | `#1A6B2B` Forest Green (M3 primary) |
| Display font | Playfair Display (Google Fonts) — headings |
| Body font | Plus Jakarta Sans (Google Fonts) — body text |
| Design system | Material Design 3 (custom forest green token set) |
| Platform | Mobile-first, fully responsive web app |
| Hosting | Vercel free tier |
| URL | `elan-greens.vercel.app` |
| Language | Simple English (Indian urban style) |
| Version | 3.0 |

---

## 3. Data Model Summary

Seven Supabase PostgreSQL tables:

- **`plant_species`** — one row per unique species. Botanical data, descriptions, all images, enrichment fields.
- **`plant_instances`** — one row per physical plant in the society. Location, GPS, plantation date.
- **`staff_data`** — gardening and maintenance team members.
- **`plant_species_links`** — bidirectional "related species" relationships (e.g. Same family / Same use).
- **`news_sources`** — admin-managed whitelist of trusted news domains for the News feed.
- **`app_settings`** — tuneable numeric knobs for the news algorithm.
- **`news_topic_queries`** — admin-configurable RSS search terms for community/landscaping topics.

Full schema: `supabase/schema.sql`
ER diagram: `docs/ER_DIAGRAM.md`

---

## 4. Main App Pages

### Page 1 — Plant Listing (Home)

**Header card:** App name ("Elan Greens") in Playfair Display + tagline. M3 `surface-container-low` background, `rounded-[28px]`.

**Stats strip:** Live chips — `X species · X plants across the society`

**Search bar:** Full-width, `surface-container-highest`, rounded-full. Inline × clear button. Debounced 300ms autosuggest on `common_name`.

**Filter chips** (M3 style — outlined at rest, filled + checkmark when active, horizontal scroll):
- Category: Tree / Palm / Shrub / Herb / Creeper / Climber / Hedge / Grass
- Type: Flowering / Non-Flowering
- Height: Short / Medium / Tall
- Toxicity: Safe / Caution

**Sort:** M3 Segmented Button — A–Z / Z–A / Newest.

**Plant cards** — 2-column grid (mobile), 3–4 columns (desktop):
- Thumbnail image (4:3 ratio, object-cover), `rounded-[16px]`, `shadow-elevation-1` (→ `elevation-3` on hover)
- Category badge (tonal colour pill, top-left overlay)
- Common Name (bold, M3 `on-surface`)
- Botanical Name (italic, `on-surface-variant`)
- Hindi / Kannada / Tamil name (first available)
- `📍 X locations` chip
- `TENTATIVE` badge if `tentative = true`

---

### Page 2 — Plant Detail

- **Hero:** Full-width main image, `rounded-[28px]`, ZoomableImage lightbox on tap/click. Common Name + Botanical Name on gradient overlay.
- **Names row:** Hindi · Kannada · Tamil (shown only when available)
- **Info pills:** Category · Height · Flowering type · Season · Family · Foliage type (Evergreen/Deciduous)
- **Ecology strip:** Toxicity badge · Edible parts · Native region · Sunlight · Watering
- **Conservation & growth:** Conservation status (IUCN-coloured badge: Least Concern → green, Vulnerable → amber, Endangered → red) · Growth rate · Propagation methods · Habitat type
- **iNaturalist observations:** Global count shown as social-proof chip if available
- **Interesting fact:** Highlighted `primary-container` card (if available)
- **Description:** 2–3 sentences
- **Medicinal / ecological properties:** Bulleted list
- **10-image gallery (SubImageGallery):** Grouped by Flowers (2) / Fruits (2) / Leaves (2) / Bark (2) / Roots (2)
  - Each image tap/click opens fullscreen lightbox (React Portal, `z-[9999]`)
  - Missing image slots: *"Photo not available yet"*
  - `not_applicable_parts` slots: *"Not applicable for this species"*
  - Attribution caption below each image
- **Related species:** Cards for linked species (from `plant_species_links` table) with link type label (e.g. "Same family", "Common companion")
- **Locations in society:**
  - Leaflet.js mini-map with one pin per active instance
  - Pin popup: *"Tree #47 · Behind Block E · Planted: Mar 2021 · Age: 4 yrs 1 month"*
  - Text list of all locations (accessibility)
- **Back to listing** text button with SVG arrow

---

### Page 3 — Plant News

**Purpose:** Surface curated positive plant and greenery news relevant to the society — both species-specific and Bengaluru community/landscaping stories.

**Header card:** "Plant News" title + subtitle: *"Curated positive stories about plants in your garden — updated hourly."*

**Feed:** Server-rendered list of `NewsArticle` cards, streamed via Suspense (page shell renders instantly).

**Article card layout:**
- Source avatar (initial letter, `secondary-container` pill) + source name + relative time (e.g. "2h ago") + optional geo tag (📍 Bengaluru / Karnataka / South India / India)
- Headline as link (opens article in new tab)
- **Plant chips** (if any garden plants mentioned in article): tap → plant detail page
- **Topic chip** (only when no plant chips): emoji + label e.g. "🌳 Green Bengaluru", "🏘️ Community" — indicates the community/landscaping topic that matched

**No-results state:** Empty-state illustration with *"No recent positive news — check back tomorrow."*

**Loading skeleton:** 5 animated pulse cards while feed loads.

**News algorithm (newsService.ts — server only):**
1. Reads `plant_species`, `news_sources`, `app_settings`, `news_topic_queries` in parallel from DB
2. Plant batch queries: groups of 4 plants → `"Common Name" OR "Botanical Name"` → Google News RSS
3. Topic queries: one RSS fetch per `news_topic_queries` row
4. All fetches fire in parallel
5. Deduplicates by `guid` — plant-batch version beats topic version for same article
6. Filters to whitelisted `news_sources` domains (fallback to hardcoded list)
7. Scores: `recencyScore(pubDateMs) + geoScore(bodyText)` — Bengaluru > Karnataka > South India > India
8. Plant chip priority: any garden plant name in article text → show plant chips, no topic chip
9. Per-plant cap (`news_max_per_plant`, default 2) prevents one species dominating
10. Horizontal floor: ensures ≥ 4 distinct plants in top results

**News settings (admin-configurable):**
| Setting | Default | Meaning |
|---|---|---|
| `news_max_articles` | 10 | Articles shown in feed |
| `news_max_plant_tags` | 3 | Max plant chips per article |
| `news_max_plants` | 20 | Top N plants queried for |
| `news_max_per_plant` | 2 | Max articles per primary plant |
| `news_max_age_days` | 365 | Hard cutoff age |
| `news_cache_hours` | 24 | RSS cache TTL |

**Trusted news sources (seeded defaults):**
The Better India · Down to Earth · Mongabay India · The Wire Science · Sanctuary Asia · Deccan Herald · The Hindu · New Indian Express · Indian Express · Bangalore Mirror

---

### Page 4 — Map

- Leaflet.js map (OpenStreetMap tiles) with all active plant instance pins
- **Open in Google Maps** button
- Society address and coordinates

---

### Page 5 — About Elan Greens

- What the app is and why it was built
- **Green Team CTA card** (`secondary-container` tonal card): *"Meet the Green Team →"* — links to `/green-team`
- Data sources: Wikimedia Commons, iNaturalist, Plant.id
- *"Built with ♥ for the Elan community."*

---

### Page 6 — Our Green Team (`/green-team`)

- Heading: *"The Hands Behind Every Bloom"*
- Tribute paragraph
- Staff cards (M3 elevated): name, role chip (tonal colour), tenure (*"X yrs Y months with us"*), speciality, tribute note, photo

> **Navigation note:** Green Team is accessible via the About page, not from the primary nav tabs. Primary nav has 4 items only.

---

### Navigation

- **Mobile:** Bottom bar (M3 Navigation Bar) — 4 tabs with `secondary-container` active indicator pill:
  - 🌿 Plants (leaf SVG icon)
  - 🗺 Map (pin SVG icon)
  - 📰 News (envelope SVG icon)
  - ℹ️ About (info SVG icon)
- **Desktop:** Top navigation bar — same 4 items. Scroll-aware: flat at top → elevated (`shadow-elevation-2`) on scroll.

---

## 5. Admin App Summary

Separate app at `elan-greens-admin.vercel.app`. Full PRD in `elan-greens-admin/docs/PRD-v3.0.md`.

Key capabilities:
- Google OAuth login restricted to `ankitryai@gmail.com`
- Add / edit / soft-delete plant species and instances
- Camera upload → Plant.id + Google Vision auto-identification
- **Populate from Name** — GBIF + POWO + iNaturalist + IUCN enrichment in one click
- Wikimedia Commons + iNaturalist auto-image-fetch with review/delete per image
- Linked species management (bidirectional relationships)
- Add / edit / soft-delete staff members
- **Settings page** — News Sources, App Settings, Topic Queries (all admin-configurable)

---

## 6. Non-Functional Requirements

See `docs/NFR.md` for full targets.

Key: LCP < 2.5s · INP < 100ms · CLS < 0.1 · Mobile Lighthouse ≥ 85

The News page uses `<Suspense>` streaming — page shell renders in < 200ms; feed card streams in separately.

---

## 7. Out of Scope

- User login or accounts for residents
- Residents adding/editing data
- Push notifications
- Offline / PWA mode
- Multi-language toggle (Hindi/Kannada UI)
- Audit log UI
- Polygon-based location mapping for lawn grasses
- Real-time news from social media or local WhatsApp groups
- Personalised news based on which plants a resident has observed

---

## 8. Future Considerations (Backlog)

These are not committed — ideas surfaced during v3.0 design:

- **Resident plant observations** — allow residents to mark *"I spotted this today"* (no account needed, just a counter)
- **Seasonal bloom alerts** — push notification when a flowering species enters season
- **Sustainability score card** — how the society's plant mix scores on biodiversity, carbon, and water indices
- **QR-code plant tags** — physical tags in the garden linking to plant detail pages
- **Society comparison** — nearby societies' plant diversity vs Elan (public data only)

---

## 9. Version History

| Version | Date | Summary of Changes |
|---------|------|--------------------|
| 1.0 | April 2026 | Initial PRD — single flat plant table, Google Sheets backend |
| 2.0 | April 2026 | Split to species + instances model. Admin app. Plant.id + Google Vision + Wikimedia. Staff pages. |
| **3.0** | **May 2026** | **See delta below** |

### v3.0 Delta — Product Asks and Delivered Features

#### 3.1 Material Design 3 Visual Redesign
**Ask:** Modernise the UI with a premium feel appropriate for a society community app.

**Delivered:**
- Complete M3 token system in `globals.css` — forest green palette, 5-level surface hierarchy, elevation shadows
- Font swap: Dancing Script → **Playfair Display** (display/headings) + Inter → **Plus Jakarta Sans** (body)
- M3 Navigation Bar (mobile) and scroll-aware Top App Bar (desktop) — both with active indicator pill
- M3 Filter Chips (outlined → filled + checkmark on active), M3 Segmented Button for sort
- Elevated Cards with `shadow-elevation-1` hover → `elevation-3`
- Tonal containers for info blocks, CTAs, category labels
- ZoomableImage lightbox using React Portal (`z-[9999]`) to clear nav bars on mobile

#### 3.2 Linked Species
**Ask:** Show residents related plants alongside each species (same family, common companions, etc.).

**Delivered:**
- New `plant_species_links` table — bidirectional, one row covers both directions via `LEAST/GREATEST` unique index
- Plant detail page shows "Related Plants" section with linked species cards
- Admin: manage links on the edit species page — search, add with label, remove

#### 3.3 Enrichment Pipeline ("Populate from Name")
**Ask:** Reduce manual data entry for botanical fields — auto-fill from authoritative sources.

**Delivered:**
- Admin "🌿 Populate from Name" button on Add and Edit pages
- Fires GBIF + POWO + iNaturalist + IUCN Red List **in parallel**
- Fills: `foliage_type`, `conservation_status`, `observations_count`, `growth_rate`, `propagation_methods`, `habitat_type`
- New fields shown on plant detail: IUCN conservation status (colour-coded), growth rate, propagation, habitat, iNat observation count

#### 3.4 Enhanced Sub-Image Pipeline
**Ask:** Improve image curation — let admin review before saving, support deleting old images.

**Delivered:**
- iNaturalist fallback when Wikimedia returns no results (with annotation filters: Flowers/Fruits/Leaves)
- Genus-level iNaturalist fallback with amber "⚠ Genus-level — verify species match" warning
- Per-image × reject button on fetched images before saving
- "Reject all" per category
- Saved (existing DB) images show 🗑 delete marker → "Will be deleted on save" overlay with Undo
- Debug provenance panel showing source (Wikimedia / iNaturalist) + query used

#### 3.5 News Tab
**Ask:** Add a curated news section showing recent positive stories about plants in the garden and Bengaluru greenery — to deepen residents' connection with the green spaces around them.

**Delivered:**
- New "News" tab in primary navigation (replaced Green Team; Green Team moved inside About)
- `newsService.ts` — server-only, fires plant batch queries + topic queries in parallel via Google News RSS
- Two-layer date gating: `after:YYYY-MM-DD` in query string + hard `pubDateMs >= cutoffMs` cutoff in code
- Recency + geo scoring formula (Bengaluru articles rank higher)
- Per-plant cap + horizontal plant diversity floor in article selection
- Plant chips on articles that mention garden species → tap to plant detail page
- 24-hour RSS cache (configurable), Suspense streaming for fast page-shell load
- 10 trusted news domains seeded (The Better India, Mongabay India, The Wire Science, etc.)

#### 3.6 Topic Queries (Community/Landscaping News)
**Ask:** Extend news beyond plant-specific results to cover Bengaluru landscaping, apartment gardens, and community green spaces.

**Delivered:**
- New `news_topic_queries` table — admin-configurable RSS search terms
- 8 seeded queries: "Bengaluru landscaping", "apartment garden Bangalore", "Lalbagh Bengaluru", "Cubbon Park Bengaluru", "native plants Bangalore", "urban greening Bengaluru", "terrace garden Bengaluru", "green building Karnataka"
- Topic chip (🌳 / 🏘️ / 🌱) shown on articles that match a topic but no garden plant
- Plant chip always wins over topic chip if both match — plant relevance takes priority

#### 3.7 Admin Settings Page
**Ask:** Allow admin to manage news sources, tune algorithm knobs, and configure topic queries — without code changes.

**Delivered:**
- New `/settings` page in admin app, linked from sidebar navigation
- **Section 1 — News Sources:** toggle enabled/disabled, set priority, delete, add domain
- **Section 2 — News Settings:** editable numeric knobs for all 6 algorithm parameters
- **Section 3 — Topic Queries:** toggle, reprioritise, delete, add new query with chip label + icon
