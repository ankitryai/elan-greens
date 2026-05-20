// ============================================================================
// Elan Greens — News Service  (SERVER ONLY — never import in 'use client' files)
//
// Fetches Google News RSS in plant-name batches, filters by a DB-managed
// domain whitelist, scores for recency + geo proximity, and applies a
// per-plant cap so no single species monopolises the feed.
//
// Date gating — two layers:
//   1. `after:YYYY-MM-DD` in the RSS query itself   (API-level filter)
//   2. Hard cutoff on pubDateMs in code              (catches any stragglers)
// ============================================================================

import { createPublicClient } from '@/lib/supabase'

// ── Public types ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  title:        string
  url:          string          // Google News redirect — opens the real article
  sourceDomain: string          // e.g. "thebetterindia.com"
  sourceLabel:  string          // e.g. "The Better India"
  pubDate:      string          // RFC 2822 as returned by Google RSS
  pubDateMs:    number          // parsed ms since epoch (for sort / display)
  plants:       Array<{ id: string; common_name: string }>
  geoTag:       string | null
}

// ── Internal types ────────────────────────────────────────────────────────────

interface RSSItem {
  title:        string
  url:          string
  guid:         string
  pubDateMs:    number
  pubDate:      string
  bodyText:     string
  sourceDomain: string
  sourceLabel:  string
}

interface PlantRow {
  id:                 string
  common_name:        string
  botanical_name:     string | null
  observations_count: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_DOMAINS = [
  'thebetterindia.com',
  'downtoearth.org.in',
  'india.mongabay.com',
  'science.thewire.in',
  'sanctuaryasia.com',
  'deccanherald.com',
  'thehindu.com',
  'newindianexpress.com',
  'indianexpress.com',
]

const GEO_TIERS = [
  { terms: ['bengaluru', 'bangalore'],                                       score: 30, tag: 'Bengaluru'   },
  { terms: ['karnataka'],                                                    score: 20, tag: 'Karnataka'   },
  { terms: ['south india', 'tamil nadu', 'andhra', 'kerala', 'telangana'], score: 15, tag: 'South India' },
  { terms: ['india', 'indian'],                                              score: 10, tag: 'India'       },
] as const

// ── XML helpers ───────────────────────────────────────────────────────────────

function stripCDATA(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function cleanField(raw: string): string {
  return stripTags(decodeEntities(stripCDATA(raw))).trim()
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

// ── RSS parser ────────────────────────────────────────────────────────────────

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) !== null) {
    const raw = m[1]

    const title   = cleanField(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1]             ?? '')
    const url     = cleanField(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1]               ?? '')
    const guid    = cleanField(raw.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]          ?? url)
    const pubDate = cleanField(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]         ?? '')
    const desc    = cleanField(raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '')
    const srcUrl  = raw.match(/<source[^>]*url="([^"]+)"/)?.[1]                         ?? ''
    const srcLbl  = cleanField(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]      ?? '')

    if (!title || !url) continue

    const pubDateMs = pubDate ? Date.parse(pubDate) : 0

    items.push({
      title,
      url,
      guid:         guid || url,
      pubDate,
      pubDateMs,
      bodyText:     `${title} ${desc}`.toLowerCase(),
      sourceDomain: extractDomain(srcUrl),
      sourceLabel:  srcLbl || extractDomain(srcUrl),
    })
  }

  return items
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function recencyScore(pubDateMs: number): number {
  if (!pubDateMs) return 10
  const ageDays = (Date.now() - pubDateMs) / 86_400_000
  if (ageDays <= 1)  return 100
  if (ageDays <= 7)  return  75
  if (ageDays <= 30) return  40
  if (ageDays <= 90) return  20
  return 10
}

function geoScore(bodyText: string): { score: number; tag: string | null } {
  for (const tier of GEO_TIERS) {
    if (tier.terms.some(t => bodyText.includes(t))) {
      return { score: tier.score, tag: tier.tag }
    }
  }
  return { score: 0, tag: null }
}

// ── RSS fetch ─────────────────────────────────────────────────────────────────

async function fetchBatch(
  plants:       PlantRow[],
  afterDate:    string,   // YYYY-MM-DD — passed to Google's `after:` operator
  cacheSeconds: number,
): Promise<RSSItem[]> {

  // Build query: "Common Name" OR "Botanical Name" for each plant in the batch
  const terms = plants
    .flatMap(p => {
      const names: string[] = [`"${p.common_name}"`]
      if (p.botanical_name) names.push(`"${p.botanical_name}"`)
      return names
    })
    .join(' OR ')

  // `after:` tells Google News to only return articles published after this date.
  // We wrap the OR terms in parens so the date operator applies to the whole set.
  const query = `(${terms}) after:${afterDate}`

  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=en-IN&gl=IN&ceid=IN:en`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElanGreensBot/1.0; +https://elan-greens.vercel.app)' },
      next: { revalidate: cacheSeconds },
    })
    if (!res.ok) return []
    return parseRSS(await res.text())
  } catch {
    return []
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchPlantNews(): Promise<NewsArticle[]> {
  try {
    const db = createPublicClient()

    const [plantsRes, sourcesRes, settingsRes] = await Promise.all([
      db.from('plant_species')
        .select('id, common_name, botanical_name, observations_count')
        .is('deleted_at', null)
        .eq('active', true)
        .not('img_main_url', 'is', null)
        .order('observations_count', { ascending: false, nullsFirst: false }),
      db.from('news_sources').select('domain').eq('enabled', true).order('priority', { ascending: false }),
      db.from('app_settings').select('key, value'),
    ])

    // ── Resolve settings ────────────────────────────────────────────────────
    const settingsMap = Object.fromEntries(
      (settingsRes.data ?? []).map(s => [s.key as string, s.value as string])
    )
    const maxArticles  = parseInt(settingsMap.news_max_articles   ?? '10',  10)
    const maxTags      = parseInt(settingsMap.news_max_plant_tags  ?? '3',   10)
    const maxPlants    = parseInt(settingsMap.news_max_plants      ?? '20',  10)
    const maxPerPlant  = parseInt(settingsMap.news_max_per_plant   ?? '2',   10)
    const maxAgeDays   = parseInt(settingsMap.news_max_age_days    ?? '365', 10)
    const cacheHours   = parseInt(settingsMap.news_cache_hours     ?? '24',  10)
    const cacheSeconds = cacheHours * 3600

    // ── Date gate ───────────────────────────────────────────────────────────
    // Layer 1: `after:YYYY-MM-DD` in the RSS query (reduces API-side results)
    // Layer 2: hard cutoff on pubDateMs below (catches any stragglers)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)
    const afterDateStr = cutoffDate.toISOString().split('T')[0]   // YYYY-MM-DD
    const cutoffMs     = cutoffDate.getTime()

    // ── Domains ─────────────────────────────────────────────────────────────
    const domains: string[] =
      (sourcesRes.data ?? []).length
        ? (sourcesRes.data ?? []).map((s: { domain: string }) => s.domain)
        : FALLBACK_DOMAINS

    // ── Plants to query ─────────────────────────────────────────────────────
    const plants = ((plantsRes.data ?? []) as PlantRow[]).slice(0, maxPlants)
    if (!plants.length) return []

    // Batch into groups of 4
    const batches: PlantRow[][] = []
    for (let i = 0; i < plants.length; i += 4) batches.push(plants.slice(i, i + 4))

    // Fetch all batches in parallel (each URL is server-side cached)
    const batchResults = await Promise.all(
      batches.map(b => fetchBatch(b, afterDateStr, cacheSeconds))
    )

    // ── Flatten + deduplicate ────────────────────────────────────────────────
    const seen = new Set<string>()
    const unique = batchResults.flat().filter(item => {
      if (seen.has(item.guid)) return false
      seen.add(item.guid)
      return true
    })

    // ── Filter: domain whitelist + hard age cutoff ───────────────────────────
    const filtered = unique.filter(item =>
      domains.includes(item.sourceDomain) &&
      (!item.pubDateMs || item.pubDateMs >= cutoffMs)   // Layer 2 age gate
    )

    // ── Score ────────────────────────────────────────────────────────────────
    type Scored = {
      item:   RSSItem
      plants: Array<{ id: string; common_name: string }>
      geoTag: string | null
      score:  number
    }

    const scored: Scored[] = filtered.map(item => {
      const matched = plants.filter(p =>
        item.bodyText.includes(p.common_name.toLowerCase()) ||
        (p.botanical_name && item.bodyText.includes(p.botanical_name.toLowerCase()))
      )
      const geo  = geoScore(item.bodyText)
      const base = recencyScore(item.pubDateMs) + geo.score
      return {
        item,
        plants: matched.slice(0, maxTags).map(p => ({ id: p.id, common_name: p.common_name })),
        geoTag: geo.tag,
        score:  base,
      }
    })

    // Remove articles with no plant match
    const matched = scored.filter(s => s.plants.length > 0)
    matched.sort((a, b) => b.score - a.score)

    // ── Greedy selection with per-plant cap ──────────────────────────────────
    const selected: Scored[] = []
    const plantCounts = new Map<string, number>()

    for (const entry of matched) {
      if (selected.length >= maxArticles) break
      const primaryId    = entry.plants[0].id
      const currentCount = plantCounts.get(primaryId) ?? 0
      if (currentCount >= maxPerPlant) continue
      selected.push(entry)
      plantCounts.set(primaryId, currentCount + 1)
    }

    // ── Horizontal floor: ensure ≥ 4 distinct plants where possible ──────────
    const distinctIds = new Set(selected.flatMap(s => s.plants.map(p => p.id)))
    if (distinctIds.size < 4) {
      for (const entry of matched) {
        if (selected.length >= maxArticles) break
        if (selected.includes(entry)) continue
        const isNew = entry.plants.some(p => !distinctIds.has(p.id))
        if (isNew) {
          selected.push(entry)
          entry.plants.forEach(p => distinctIds.add(p.id))
        }
      }
    }

    return selected.map(({ item, plants: ps, geoTag }) => ({
      title:        item.title,
      url:          item.url,
      sourceDomain: item.sourceDomain,
      sourceLabel:  item.sourceLabel,
      pubDate:      item.pubDate,
      pubDateMs:    item.pubDateMs,
      plants:       ps,
      geoTag,
    }))
  } catch {
    return []
  }
}
