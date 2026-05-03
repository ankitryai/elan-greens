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

# Deploy to Vercel production (CLI only — not the dashboard Redeploy button)
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod

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
- `TopNav` — desktop only (`hidden md:flex`), fixed top, `z-50`
- `BottomNav` — mobile only (`md:hidden`), fixed bottom, `z-50`, uses `usePathname` so it must be `'use client'`
- Body padding accounts for both navs via CSS custom properties in `globals.css`
- Any overlay that must sit above the navs needs `createPortal` + `z-[9999]` (see Lightbox section above)

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase project as admin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/publishable key only — no service role key here |

`NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` for local dev only.

---

## Key lessons learned

1. **`force-dynamic` not `revalidate`**: Using `export const revalidate = 3600` causes Vercel build to call `createPublicClient()` at build time when env vars don't exist yet → crash. `force-dynamic` defers all DB calls to runtime.
2. **Vercel "Redeploy" button** re-runs the previous build and does NOT pick up new commits. Always use `vercel --prod` CLI.
3. **`supabaseKey is required`** error on Vercel = env var missing at build time. Fix: ensure all query functions have `try/catch` and `force-dynamic` is set on pages.
4. **Lightbox taps/clicks not working on mobile** — root cause is always z-index stacking context, not event handling. Both nav bars use `z-50`; any overlay rendered in the normal tree gets buried. Fix with `createPortal(overlay, document.body)` + `z-[9999]`. See the Lightbox section above.
5. **Server Components can import Client Components** — `ZoomableImage` is `'use client'` but is imported directly in the server-rendered `plants/[id]/page.tsx`. This is valid Next.js; the server component renders it as a leaf client island.
