# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Elan Greens — Public App

Read-only public plant directory for Divyasree Elan Homes residents. Deployed at `elan-greens.vercel.app`. Data is managed via the companion admin app at `elan-greens-admin.vercel.app` (separate repo).

---

## Commands

```bash
# Local dev (corporate network needs TLS bypass)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# Production build
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build

# Deploy to Vercel production — CLI is blocked on corporate network; push to GitHub instead
git push origin main   # triggers Vercel auto-deploy via GitHub integration

# Tests
npm test
npm run test:watch
npx vitest run src/__tests__/formatters.test.ts
```

---

## Architecture

### No auth, no writes
This app has zero authentication. The Supabase anon key + RLS ensures visitors can only SELECT active, non-deleted rows. All data flows one way: admin app writes → Supabase → this app reads.

### Supabase client
Single file `src/lib/supabase.ts` exports `createPublicClient()` using plain `@supabase/supabase-js` (no `@supabase/ssr`, no cookies). Every query function wraps its body in `try/catch` returning empty data — this prevents Vercel build failures when env vars are absent during prerender.

```ts
export async function getAllSpecies(): Promise<PlantSpecies[]> {
  try {
    const db = createPublicClient()
    // ...query...
  } catch { return [] }   // ← critical for Vercel build
}
```

### Next.js 16.2.4 quirks
Same framework as the admin app:
- `params` and `searchParams` are Promises — always `await` them
- `dynamic(() => import(...), { ssr: false })` only works inside `'use client'` files
- All pages that call Supabase use `export const dynamic = 'force-dynamic'` (not `revalidate`) to prevent build-time DB calls

### Material Design 3 design system
The entire UI uses a custom M3 token system defined in `src/app/globals.css`. **Never use hardcoded colours** — always reference CSS custom properties.

**Key tokens:**
```css
--md-primary: #1A6B2B               /* forest green */
--md-primary-container: #A8F5A0
--md-secondary-container: #...
--md-surface-container-lowest: #FFFFFF
--md-surface-container-low / -container / -container-high / -container-highest
--md-on-surface / --md-on-surface-variant / --md-outline / --md-outline-variant
--md-elevation-1 / --md-elevation-2 / --md-elevation-3  /* box-shadow values */
--md-font-display: 'Playfair Display', Georgia, serif
--md-font-body: 'Plus Jakarta Sans', system-ui, sans-serif
```

**M3 surface hierarchy** (lowest = brightest white → highest = most tinted):
`surface-container-lowest` → `surface-container-low` → `surface-container` → `surface-container-high` → `surface-container-highest`

**Tailwind v4 bridge** — `globals.css` maps `--color-*` and `--shadow-*` to Tailwind utilities via `@theme inline`. Use `bg-surface-container-low`, `shadow-elevation-1` etc. in Tailwind classes.

**Component patterns:**
- Cards: `rounded-[16px]` or `rounded-[20px]`, `shadow-elevation-1` (hover → `elevation-2/3`)
- Chips/tags: `rounded-full`, `px-2.5 py-1`, `text-[11px]`
- Hero sections: `rounded-[28px]`
- Active nav items: `secondary-container` pill behind icon
- Info blocks: `primary-container` background
- CTA cards: `secondary-container` background

### CSS-only hover effects — required for Server Components
Server Components **cannot** use `onMouseEnter`/`onMouseLeave`. Use CSS classes in `globals.css` instead:

```css
/* globals.css */
.news-card { box-shadow: var(--md-elevation-1); transition: box-shadow 200ms; }
.news-card:hover { box-shadow: var(--md-elevation-2); }
.plant-tag-chip { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.plant-tag-chip:hover { background: var(--md-secondary-container); }
```

`onMouseEnter`/`onMouseLeave` are only valid in `'use client'` components.

### News feed — `src/lib/newsService.ts` (SERVER ONLY)
**Never import this file in a `'use client'` component.** It calls Supabase + external RSS — server only.

**How it works:**
1. Reads `plant_species`, `news_sources`, `app_settings`, `news_topic_queries` from DB in parallel
2. Builds plant batch queries (4 plants per query, `"Common Name" OR "Botanical Name"`) — fetches Google News RSS
3. Builds topic query fetches (one per `news_topic_queries` row) — also Google News RSS
4. All fetches fire in parallel via `Promise.all`
5. Deduplicates by `guid` — plant-batch version wins over topic version for same article
6. Filters to whitelisted domains (`news_sources` table, fallback hardcoded list)
7. Scores: `recencyScore(pubDateMs) + geoScore(bodyText)` — Bengaluru > Karnataka > South India > India
8. Plant chip priority: if any garden plant name appears in article text → plant chips shown, topicChip = null
9. Per-plant cap (`news_max_per_plant`, default 2) prevents one species dominating
10. Horizontal floor: ensures ≥ 4 distinct plants in top results where possible

**Key settings (in `app_settings` table):**
| key | default | meaning |
|---|---|---|
| `news_max_articles` | 10 | Max articles returned |
| `news_max_plant_tags` | 3 | Max plant chips per article |
| `news_max_plants` | 20 | How many top plants to query for |
| `news_max_per_plant` | 2 | Max articles per primary plant |
| `news_max_age_days` | 365 | Hard cutoff — older articles excluded |
| `news_cache_hours` | 24 | RSS fetch cache TTL |

**Two-layer date gating:**
- `after:YYYY-MM-DD` in every RSS query string (API-level filter)
- `pubDateMs >= cutoffMs` hard check in code (safety net for articles Google slips through)

**Google News RSS specifics:**
- URL: `https://news.google.com/rss/search?q=ENCODED_QUERY&hl=en-IN&gl=IN&ceid=IN:en`
- Append `after:YYYY-MM-DD` inside the query to gate by date
- `<source url="...">` attribute gives the actual publisher domain — NOT the Google redirect URL
- Batch up to 4 plants per query with `"Name1" OR "Name2" OR ...`
- Research institutes (IISc, WII, CWS) are not indexed in Google News directly — use `science.thewire.in` which covers them

**Topic queries (`news_topic_queries` table):**
- Admin-configurable RSS queries for community/landscaping topics (e.g. "Bengaluru landscaping")
- Each row has `query_text`, `chip_label`, `chip_icon`, `enabled`, `priority`
- Articles that match a topic query AND contain a garden plant name → show plant chips (plant wins)
- Articles that match a topic query but NO garden plant → show `topicChip` (🌳 / 🏘️ etc.)
- Manage via admin Settings → Topic Queries section

**To force a fresh fetch** (bypass 24h cache): change `news_cache_hours` to `1` in admin Settings, load the news page once, then set it back to `24`.

### News page — `src/app/news/page.tsx`
- `export const dynamic = 'force-dynamic'` — defers all fetches to runtime
- The RSS `fetch()` calls carry their own `next: { revalidate: N }` headers — caching happens at the fetch layer, not the page layer
- Uses `<Suspense fallback={<NewsLoadingSkeleton/>}>` — page shell renders instantly, feed streams in
- `ArticleCard` is a pure Server Component — hover effects via CSS classes only (no event handlers)
- Plant tags are `<Link>` components, headline is `<a>` — they are **siblings**, never nested

**Nested anchor anti-pattern — never do this:**
```tsx
// WRONG — <Link> renders as <a> nested inside <a> → invalid HTML, clicks break
<a href={article.url}>
  <Link href={`/plants/${plant.id}`}>...</Link>  // ← nested anchor!
</a>

// CORRECT — outer card is <div>, headline and plant tags are siblings
<div className="news-card">
  <a href={article.url}>headline</a>
  <Link href={`/plants/${plant.id}`}>plant tag</Link>
</div>
```

### Leaflet map — three-level UX (L0 / L1 / L2)
`/app/map/page.tsx` is a Server Component that fetches all data and passes it to `<MapClient>`. `MapClient.tsx` is a `'use client'` wrapper that does `dynamic(() => import('@/components/LeafletMap'), { ssr: false })`. `LeafletMap.tsx` is also `'use client'` and imports Leaflet inside `useEffect`. This two-layer pattern is required because `ssr: false` is not allowed in Server Components in Next.js 16.

**Map UX levels:**
- **L0 (All):** One pin per unique species (first/representative landmark). `LeafletMap` remounts on every level change via `key={mapKey}` where `mapKey = \`${activeCategory ?? 'all'}-${activeSpeciesId ?? 'none'}\``.
- **L1 (category chip active):** Chip label = unique species count for that category (not pin count). Map still shows one pin per species in that category. Plant list below shows every species as a tappable card showing "near N landmarks".
- **L2 (species tapped from list):** Map remounts showing ALL landmarks tagged to that one species. Detail card shows "Look near N landmarks" + all landmark pills. "Back to Trees/Shrubs/etc." button returns to L1.

**State in `MapClient.tsx`:**
```typescript
const [activeCategory, setActiveCategoryState] = useState<PlantCategory | null>(initialCategory)
const [activeSpeciesId, setActiveSpeciesId] = useState<string | null>(null)
// Sync when initialCategory prop changes (e.g. back-navigation)
useEffect(() => { setActiveCategoryState(initialCategory); setActiveSpeciesId(null) }, [initialCategory])
```

**Back-navigation fix:** `<MapClient key={initialCategory ?? 'all'} ...>` in `page.tsx` forces a full remount when the URL category changes (e.g. user presses back after visiting plant detail). Without this, `useState(initialCategory)` ignores prop changes and shows stale data while the URL shows the correct category.

**Category chip counts = unique species**, not pin count. A species tagged to 3 landmarks counts as 1, not 3. Computed from `new Map<string, PlantSpecies>()` across all `approxPins` + `exactPins`.

**`approxPins` data model:** One entry per landmark × species pair. A species tagged to 3 landmarks = 3 `ApproxPin` entries. At L0/L1 the map deduplicates to one pin per species; at L2 it shows all.

**Landmark dimming:** When `activeCategory` OR `activeSpeciesId` is set, `activeLandmarkNames` is computed from the display pins and non-relevant landmarks are rendered at `opacity: 0.18`.

**Custom block labels (pending implementation):**
OSM tiles cannot be edited in the app — add a hardcoded config overlay instead. In `LeafletMap.tsx`, define `BLOCK_LABELS` (name + centroid lat/lng) and `KEY_LOCATIONS` (gate, clubhouse etc.) arrays. Render each as a `L.divIcon` marker so the labels float above the OSM tiles. This is purely additive — OSM data is never touched. Coordinate lookup: open the map in any OSM editor or use Google Maps right-click → "What's here?" to get the lat/lng for each block centroid. Once coordinates are collected, pass them to the component and rendered via `L.marker(latlng, { icon: L.divIcon({ html, className }) })`.

### Plant detail page
`/app/plants/[id]/page.tsx` — sub-images are accessed dynamically via `species as unknown as Record<string, string | null>` to avoid TypeScript errors on the 20 image columns. `not_applicable_parts` is a pipe-separated field — use `splitPipe()` to parse before checking which image sections to hide.

### Lightbox / image zoom — React Portal pattern (CRITICAL)
Both `TopNav` and `BottomNav` use `z-50`. Any overlay rendered inside the normal document flow shares the same stacking context and the nav bars sit on top of it — clicks/taps fall through to nav links on mobile.

**The fix:** always use `createPortal(overlay, document.body)` so the overlay attaches directly to `<body>`, outside every parent stacking context. Combined with `z-[9999]` this is unambiguously the topmost layer.

Two lightbox components exist:
- `src/components/SubImageGallery.tsx` — thumbnail row + click-to-zoom lightbox for sub-images. Accepts `{ url, attr, label }[]`.
- `src/components/ZoomableImage.tsx` — wraps a single `<img>` with a click-to-zoom lightbox. Used for the main hero photo on the plant detail page.

Both follow the same pattern:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])   // SSR guard — portal only on client

// Body scroll lock + Escape key in useEffect([selected/open])
// createPortal(<overlay className="fixed inset-0 z-[9999] …">, document.body)
```

**Never** render a fullscreen overlay as a sibling in the component tree — it will be buried under the nav bars.

### Navigation
- `TopNav` — desktop only (`hidden md:flex`), fixed top, `z-50`, scroll-aware (flat → `shadow-elevation-2`)
- `BottomNav` — mobile only (`md:hidden`), fixed bottom, `z-50`, uses `usePathname` so it must be `'use client'`
- 4 tabs: Plants (leaf icon), Map (pin icon), News (envelope icon), About (info icon)
- Active indicator: `secondary-container` pill behind icon
- Body padding accounts for both navs via CSS custom properties in `globals.css`
- Any overlay that must sit above the navs needs `createPortal` + `z-[9999]` (see Lightbox section above)
- Green Team page (`/green-team`) is linked from About, NOT from primary nav

### Supabase tables (public app reads these)
| Table | Purpose |
|---|---|
| `plant_species` | Core plant data — filtered to `active=true, deleted_at IS NULL` |
| `plant_instances` | GPS locations for map pins |
| `staff_data` | Green Team member profiles |
| `news_sources` | Domain whitelist for news feed |
| `app_settings` | Tuneable knobs (news cache, max articles, etc.) |
| `news_topic_queries` | Admin-configurable community/landscaping RSS queries |
| `plant_species_links` | Bidirectional "related plants" relationships |

### Supabase migrations — SQL files in repo root
| File | Description |
|---|---|
| `supabase-news-migration.sql` | Creates `news_sources`, `app_settings`; seeds 8 sources + 4 settings |
| `supabase-news-update-1.sql` | Cache → 24h, adds `news_max_age_days`, adds science.thewire.in |
| `supabase-news-update-2.sql` | Creates `news_topic_queries`, seeds 8 queries, adds Bangalore Mirror |

Always run migrations in order. Check if the table already exists before re-running (use `CREATE TABLE IF NOT EXISTS`).

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project as admin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/publishable key only — no service role key here |

`NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` for local dev only.

---

## Key lessons learned

1. **`force-dynamic` not `revalidate`**: Using `export const revalidate = N` causes Vercel build to call `createPublicClient()` at build time when env vars don't exist yet → crash. `force-dynamic` defers all DB calls to runtime. The individual `fetch()` calls in `newsService.ts` carry `next: { revalidate }` for their own caching — that's the right layer for RSS caching.

2. **Vercel CLI is blocked on corporate network** — `vercel --prod` fails with SSL/JSON parse errors. Always deploy by pushing to GitHub — Vercel auto-deploys from the GitHub integration. Never use the Vercel dashboard "Redeploy" button either (re-runs old build without new commits).

3. **`supabaseKey is required`** error on Vercel = env var missing at build time. Fix: ensure all query functions have `try/catch` and `force-dynamic` is set on pages.

4. **Lightbox taps/clicks not working on mobile** — root cause is always z-index stacking context, not event handling. Both nav bars use `z-50`; any overlay rendered in the normal tree gets buried. Fix with `createPortal(overlay, document.body)` + `z-[9999]`. See the Lightbox section above.

5. **Server Components can import Client Components** — `ZoomableImage` is `'use client'` but is imported directly in the server-rendered `plants/[id]/page.tsx`. This is valid Next.js; the server component renders it as a leaf client island.

6. **Event handlers forbidden in Server Components** — Never add `onMouseEnter`, `onMouseLeave`, `onClick` etc. to elements in Server Components. Use CSS pseudo-classes (`:hover`, `:focus`) via named CSS classes in `globals.css` instead. This pattern covers all hover/focus effects without any JS.

7. **Nested `<a>` elements break click handling** — `<Link>` renders as `<a>`. A `<Link>` inside an `<a>` is invalid HTML — browsers flatten the nesting and inner clicks stop working. Always make the outer card a `<div>` and put headline + tag links as siblings.

8. **News articles showing as 2 years old** — Google News RSS returns *relevant* results by default, not *recent* ones. Always append `after:YYYY-MM-DD` to every RSS query string AND enforce a hard `pubDateMs >= cutoffMs` cutoff in code.

9. **Google News RSS `<link>` is a Google redirect URL** — it does NOT contain the publisher domain. The actual domain comes from `<source url="...">` attribute. Parse with `extractDomain(srcUrl)`.

10. **Research institute coverage** — IISc/IIT/WII/NCF do not have Google News-indexed RSS feeds. Use `science.thewire.in` (The Wire Science) which actively covers Indian research from these institutes.

11. **Topic query articles vs plant articles** — when the same article appears in both a plant-batch result and a topic-query result (same guid), always keep the plant-batch version (topicChip = null). Plant chips take priority in the UI. The dedup logic in `newsService.ts` handles this automatically.

12. **`git add` with `[id]` in path** — shell glob expansion breaks `git add src/app/plants/[id]/page.tsx`. Use `git add -A` or quote the path when adding files with bracket notation in their name.

13. **Vercel env var values can silently be wrong.** Always verify the VALUE prefix when checking env vars in the Vercel dashboard — not just that the key name exists. A wrong key type (e.g. a Stripe `sk_live_...` value in a Supabase field) causes silent failures with no obvious error message. Supabase JWT keys start with `eyJ`.

14. **New device setup checklist.** When moving to a new Mac: install Homebrew first (`/bin/bash -c "$(curl -fsSL ...)"`) → add to PATH (`eval "$(/opt/homebrew/bin/brew shellenv zsh)"`) → `brew install node gh` → `gh auth login` → `gh repo clone ankitryai/elan-greens` → `npm install` → create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (copy values from Vercel dashboard → Settings → Environment Variables). Always dev with `NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev`.

15. **`MapClient` must have `key={initialCategory ?? 'all'}` in `page.tsx`.** `useState(initialCategory)` only reads `initialCategory` on first mount — it ignores prop changes. When browser back restores a different URL category, the component won't update without the `key` prop forcing a remount. The `useEffect(() => { setActiveCategory(initialCategory) }, [initialCategory])` inside `MapClient` is a second guard for router-cache edge cases.

16. **`window.history.replaceState` vs `router.push` on the map page.** We use `replaceState` (not `router.push`) when changing category so the URL updates silently without causing a full page re-fetch. This keeps map interaction instant but means Next.js's router doesn't know about the URL change — only native browser history does. The trade-off: fast UX but the server component doesn't re-run on chip click (it only re-runs on a real navigation like browser back/forward).

17. **`PlantGrid` search covers five fields + category.** `common_name`, `botanical_name`, `hindi_name`, `kannada_name`, `tamil_name`, `category`, plus `search_tags` (pipe-separated Vision tags). The `getMatchHint()` helper returns which non-obvious field matched so a coloured pill can explain the result. `HINT_COLORS` is the record keyed by `'Hindi' | 'Kannada' | 'Tamil' | 'Tag'`. When the matched field is `common_name` or `botanical_name`, `getMatchHint()` returns `null` (self-evident, no pill needed).

18. **`PlantGrid` search uses stop words + bidirectional substring match.** Multi-word queries like "all yellows" are split into words; stop words (`STOP_WORDS` set: "all", "the", "show", "find", etc.) are stripped so they don't match short Kannada suffixes (e.g. "all" matching "balli"). Match logic: `token.includes(word) || word.includes(token)` — bidirectional so "herb" matches "herbs" and vice-versa.

19. **Voice search in PlantGrid uses Web Speech API, `en-IN` locale, zero cost.** The mic button only renders when `hasSpeech === true` (checked in `useEffect` — never on server). Transcribed text flows directly into the `search` state. No external API; works offline in Chrome and Safari. `SpeechRecognition` is prefixed as `webkitSpeechRecognition` on Safari.

20. **Search tip tooltip is dismissible and persisted.** A one-time tooltip on the search bar hints at language search, tag search, and voice search. Dismissed state stored in `localStorage` as `elan-search-tip-dismissed: '1'`. Dismiss on click or on first successful search.

21. **`search_tags` are pre-computed by Vision, never at query time.** The public app does plain `String.prototype.includes()` on `plant_species.search_tags`. No API call needed. Tags cover visual properties (colour, texture, shape) from Vision `LABEL_DETECTION` + `IMAGE_PROPERTIES`. If a plant has no tags yet, it simply won't match colour-based searches until the admin backfills.

22. **Map block labels — custom `L.divIcon` overlay, not OSM edits.** The apartment block names on the OSM basemap are wrong/absent. Do not edit OSM. Instead, define `BLOCK_LABELS` and `KEY_LOCATIONS` arrays in `LeafletMap.tsx` with corrected names and centroid lat/lng values (obtained from Google Maps right-click). Render as Leaflet `divIcon` markers that float above the tiles. This is purely additive and survives OSM tile updates.
