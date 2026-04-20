# Product Requirements Document
## Elan Greens — Society Plant Directory
### Version 2.0 | April 2026

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
| Logo | *"élan"* wordmark in Dancing Script font, colour `#2E7D32` |
| Brand colour | `#2E7D32` Forest Green |
| UI font | Inter (Google Fonts) |
| Platform | Mobile-first, fully responsive web app |
| Hosting | Vercel free tier |
| URL | `elan-greens.vercel.app` |
| Language | Simple English (Indian urban style) |
| Version | 1.0 |

---

## 3. Data Model Summary

Three Supabase PostgreSQL tables:

- **`plant_species`** — one row per unique species. Botanical data, descriptions, all images.
- **`plant_instances`** — one row per physical plant in the society. Location, GPS, plantation date.
- **`staff_data`** — gardening and maintenance team members.

Full schema: `supabase/schema.sql`
ER diagram: `docs/ER_DIAGRAM.md`

---

## 4. Main App Pages

### Page 1 — Plant Listing (Home)

**Header:** Logo (left) + data freshness timestamp (right): *"Updated: 20 Apr 2026, 4:30 PM"*

**Stats strip:** `22 unique species · 47 plants across the society`
(Live counts: species = COUNT of plant_species; plants = COUNT of plant_instances)

**Search bar:** Text input with autosuggest on `common_name` (debounced 300ms, case-insensitive)

**Filter chips** (horizontal scroll):
- Category: Tree / Palm / Shrub / Herb / Creeper / Climber / Hedge / Grass
- Type: Flowering / Non-Flowering
- Height: Short / Medium / Tall
- Toxicity: Safe / Caution

**Sort:** A–Z default. Toggle A–Z / Z–A.

**Plant cards** — 2-column grid (mobile), 3–4 columns (desktop):
- Thumbnail image (4:3 ratio, object-cover)
- Category badge (colour-coded pill, top-left overlay)
- Common Name (bold)
- Botanical Name (italic, smaller)
- Hindi / Kannada / Tamil name (one line, first available)
- `📍 X locations in society` chip
- `TENTATIVE` badge if `tentative = true`

**Footer:** *"Elan Greens · Divyasree Elan Homes, Sarjapur Road, Bengaluru"*

---

### Page 2 — Plant Detail

- **Hero:** Full-width main image with gradient overlay. Common Name + Botanical Name on foreground.
- **Names row:** Hindi · Kannada · Tamil (shown only when available)
- **Info pills:** Category · Height · Flowering type · Season · Family
- **Ecology strip:** Toxicity badge · Edible parts · Native region · Sunlight · Watering
- **Lifespan:** e.g. *"Lifespan: 150–200 years"*
- **Interesting fact:** Highlighted card (if available)
- **Description:** 2–3 sentences
- **Medicinal / ecological properties:** Bulleted list (pipe-separated in DB)
- **10-image gallery:** Grouped by Flowers (2) / Fruits (2) / Leaves (2) / Bark (2) / Roots (2)
  - Missing image slots: *"Photo not available yet"*
  - `not_applicable_parts` slots: *"Not applicable for this species"*
  - Attribution caption below each image
- **Locations in society:**
  - Leaflet.js mini-map (OpenStreetMap tiles, free) with one pin per active instance
  - Pin popup: *"Tree #47 · Behind Block E · Planted: Mar 2021 · Age: 4 yrs 1 month"*
  - Text list of all locations below map (for accessibility)
- **Back to listing** button

---

### Page 3 — View on Map

- Society layout plan image embedded (propertywala.com URL)
- **Open in Google Maps** button → `https://maps.app.goo.gl/WjsujCSwfjzTXcCs9`
- Address: *"Divyasree Elan Homes, Sarjapur-Marathahalli Road, opp. Total Mall, Bellandur, Bengaluru – 560035"*
- Coordinates: `12.9182°N, 77.6735°E`

---

### Page 4 — Our Green Team

- Heading: *"The Hands Behind Every Bloom"*
- Tribute paragraph
- Staff cards: name, role, tenure (*"X yrs Y months with us"* from `date_of_joining`), speciality, tribute note, photo
- Placeholder shown if photo not uploaded

---

### Page 5 — About Elan Greens

- What the app is and why it was built
- Creator: *"Created by a long-term resident of Elan Homes — a well-wisher, enthusiast of urban greenery, and a curious late learner in this area."* (anonymous)
- Data sources: Wikimedia Commons, iNaturalist, Plant.id
- Version 1.0 · April 2026

---

### Navigation

- **Mobile:** Bottom bar — 🌿 Plants · 🗺 Map · 👐 Green Team · ℹ️ About
- **Desktop:** Top navigation bar

---

## 5. Admin App Summary

Separate app at `elan-greens-admin.vercel.app`. Full PRD in `elan-greens-admin/docs/PRD-v2.0.md`.

Key capabilities:
- Google OAuth login restricted to `ankitryai@gmail.com`
- Add / edit / soft-delete plant species and instances
- Camera upload → Plant.id auto-identification → Wikimedia Commons auto-image-fetch
- Add / edit / soft-delete staff members
- Storage meter, API usage counters, field-level validations, CRUD toasts

---

## 6. Non-Functional Requirements

See `docs/NFR.md` for full targets.

Key: LCP < 2.5s · INP < 100ms · CLS < 0.1 · Mobile Lighthouse ≥ 85

---

## 7. Out of Scope (v1)

- User login or accounts for residents
- Residents adding/editing data
- Push notifications
- Offline / PWA mode
- Multi-language toggle (Hindi/Kannada UI)
- Audit log UI (DB timestamps are sufficient)
- Polygon-based location mapping for lawn grasses

---

## 8. Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | April 2026 | Initial PRD — single flat plant table, Google Sheets backend |
| 2.0 | April 2026 | Split to species + instances model. Added admin app. Full tech stack defined. |
