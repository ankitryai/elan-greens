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

### Leaflet map
`/app/map/page.tsx` is a Server Component that fetches data and passes pins to `<MapClient>`. `MapClient.tsx` is a `'use client'` wrapper that does `dynamic(() => import('@/components/LeafletMap'), { ssr: false })`. `LeafletMap.tsx` is also `'use client'` and imports Leaflet inside `useEffect`. This two-layer pattern is required because `ssr: false` is not allowed in Server Components in Next.js 16.

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
