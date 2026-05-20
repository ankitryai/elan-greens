// ============================================================================
// Elan Greens — News Service  (SERVER ONLY — never import in 'use client' files)
//
// Two query types run in parallel:
//   • Plant batches  — "Common Name" OR "Botanical Name" per group of 4 plants
//   • Topic queries  — admin-configured community/landscaping terms
//
// Priority: if a topic article also mentions a plant, plant chips win;
// topic chip only shown when no plant is matched.
//
// Date gating (two layers):
//   1. `after:YYYY-MM-DD` in every RSS query   (API-level)
//   2. Hard cutoff on pubDateMs in code         (safety net)
// ============================================================================

import { createPublicClient } from '@/lib/supabase'

// ── Public types ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  title:        string
  url:          string
  sourceDomain: string
  sourceLabel:  string
  pubDate:      string
  pubDateMs:    number
  /** Matched garden plants (max news_max_plant_tags). Takes priority over topicChip. */
  plants:       Array<{ id: string; common_name: string }>
  geoTag:       string | null
  /** Shown only when plants is empty — sourced from the topic query row. */
  topicChip:    { label: string; icon: string } | null
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
  /** Set for items from topic queries; null for plant-batch items. */
  topicChip:    { label: string; icon: string } | null
}

interface PlantRow {
  id:                 string
  common_name:        string
  botanical_name:     string | null
  observations_count: number | null
}

interface TopicQuery {
  query_text: string
  chip_label: string
  chip_icon:  string
}

// ── Fallback constants ────────────────────────────────────────────────────────

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
  'bangaloremirror.indiatimes.com',
]

const GEO_TIERS = [
  { terms: ['bengaluru', 'bangalore'],                                       score: 30, tag: 'Bengaluru'   },
  { terms: ['karnataka'],                                                    score: 20, tag: 'Karnataka'   },
  { terms: ['south india', 'tamil nadu', 'andhra', 'kerala', 'telangana'], score: 15, tag: 'South India' },
  { terms: ['india', 'indian'],                                              score: 10, tag: 'India'       },
] as const

// ── XML helpers ───────────────────────────────────────────────────────────────

function stripCDATA(s: string)  { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') }
function decodeEntities(s: string) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
}
function stripTags(s: string) { return s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() }
function cleanField(raw: string) { return stripTags(decodeEntities(stripCDATA(raw))).trim() }
function extractDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./,'') } catch { return '' }
}

// ── RSS parser ────────────────────────────────────────────────────────────────

function parseRSS(
  xml: string,
  topicChip: { label: string; icon: string } | null,
): RSSItem[] {
  const items: RSSItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) !== null) {
    const raw     = m[1]
    const title   = cleanField(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1]             ?? '')
    const url     = cleanField(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1]               ?? '')
    const guid    = cleanField(raw.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]          ?? url)
    const pubDate = cleanField(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]         ?? '')
    const desc    = cleanField(raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '')
    const srcUrl  = raw.match(/<source[^>]*url="([^"]+)"/)?.[1]                         ?? ''
    const srcLbl  = cleanField(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]      ?? '')
    if (!title || !url) continue
    items.push({
      title,
      url,
      guid:         guid || url,
      pubDate,
      pubDateMs:    pubDate ? Date.parse(pubDate) : 0,
      bodyText:     `${title} ${desc}`.toLowerCase(),
      sourceDomain: extractDomain(srcUrl),
      sourceLabel:  srcLbl || extractDomain(srcUrl),
      topicChip,
    })
  }
  return items
}

// ── Generic RSS fetch (reused for both plant batches and topic queries) ────────

async function fetchRSS(
  queryString:  string,
  afterDate:    string,
  cacheSeconds: number,
  topicChip:    { label: string; icon: string } | null = null,
): Promise<RSSItem[]> {
  const query = `(${queryString}) after:${afterDate}`
  const url   =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=en-IN&gl=IN&ceid=IN:en`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ElanGreensBot/1.0; +https://elan-greens.vercel.app)' },
      next: { revalidate: cacheSeconds },
    })
    if (!res.ok) return []
    return parseRSS(await res.text(), topicChip)
  } catch {
    return []
  }
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function recencyScore(pubDateMs: number): number {
  if (!pubDateMs) return 10
  const d = (Date.now() - pubDateMs) / 86_400_000
  if (d <=  1)  return 100
  if (d <=  7)  return  75
  if (d <= 30)  return  40
  if (d <= 90)  return  20
  return 10
}

function geoScore(bodyText: string): { score: number; tag: string | null } {
  for (const tier of GEO_TIERS) {
    if (tier.terms.some(t => bodyText.includes(t))) return { score: tier.score, tag: tier.tag }
  }
  return { score: 0, tag: null }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchPlantNews(): Promise<NewsArticle[]> {
  try {
    const db = createPublicClient()

    // Read everything in parallel
    const [plantsRes, sourcesRes, settingsRes, topicsRes] = await Promise.all([
      db.from('plant_species')
        .select('id, common_name, botanical_name, observations_count')
        .is('deleted_at', null)
        .eq('active', true)
        .not('img_main_url', 'is', null)
        .order('observations_count', { ascending: false, nullsFirst: false }),
      db.from('news_sources')
        .select('domain')
        .eq('enabled', true)
        .order('priority', { ascending: false }),
      db.from('app_settings').select('key, value'),
      db.from('news_topic_queries')
        .select('query_text, chip_label, chip_icon')
        .eq('enabled', true)
        .order('priority', { ascending: false }),
    ])

    // ── Settings ─────────────────────────────────────────────────────────────
    const sm = Object.fromEntries(
      (settingsRes.data ?? []).map(s => [s.key as string, s.value as string])
    )
    const maxArticles  = parseInt(sm.news_max_articles   ?? '10',  10)
    const maxTags      = parseInt(sm.news_max_plant_tags  ?? '3',   10)
    const maxPlants    = parseInt(sm.news_max_plants      ?? '20',  10)
    const maxPerPlant  = parseInt(sm.news_max_per_plant   ?? '2',   10)
    const maxAgeDays   = parseInt(sm.news_max_age_days    ?? '365', 10)
    const cacheSeconds = parseInt(sm.news_cache_hours     ?? '24',  10) * 3600

    const domains: string[] =
      (sourcesRes.data ?? []).length
        ? (sourcesRes.data ?? []).map((s: { domain: string }) => s.domain)
        : FALLBACK_DOMAINS

    const plants      = ((plantsRes.data ?? []) as PlantRow[]).slice(0, maxPlants)
    const topicQueries = (topicsRes.data ?? []) as TopicQuery[]

    // ── Date gate ─────────────────────────────────────────────────────────────
    const cutoffDate   = new Date(Date.now() - maxAgeDays * 86_400_000)
    const afterDateStr = cutoffDate.toISOString().split('T')[0]
    const cutoffMs     = cutoffDate.getTime()

    // ── Build fetch tasks ─────────────────────────────────────────────────────

    // Plant batches (groups of 4, common + botanical names)
    const plantFetches: Promise<RSSItem[]>[] = []
    for (let i = 0; i < plants.length; i += 4) {
      const batch = plants.slice(i, i + 4)
      const terms = batch
        .flatMap(p => {
          const n = [`"${p.common_name}"`]
          if (p.botanical_name) n.push(`"${p.botanical_name}"`)
          return n
        })
        .join(' OR ')
      plantFetches.push(fetchRSS(terms, afterDateStr, cacheSeconds, null))
    }

    // Topic queries (one fetch each)
    const topicFetches: Promise<RSSItem[]>[] = topicQueries.map(tq =>
      fetchRSS(
        tq.query_text,
        afterDateStr,
        cacheSeconds,
        { label: tq.chip_label, icon: tq.chip_icon },
      )
    )

    // Fire all in parallel
    const allResults = await Promise.all([...plantFetches, ...topicFetches])

    // ── Deduplicate by guid ───────────────────────────────────────────────────
    // When a topic article and a plant article share the same guid, keep the
    // plant-batch version (topicChip = null) — plant tags take priority.
    const guidMap = new Map<string, RSSItem>()
    for (const item of allResults.flat()) {
      const existing = guidMap.get(item.guid)
      if (!existing || (existing.topicChip !== null && item.topicChip === null)) {
        guidMap.set(item.guid, item)
      }
    }
    const unique = Array.from(guidMap.values())

    // ── Filter: domain whitelist + hard age cutoff ────────────────────────────
    const filtered = unique.filter(item =>
      domains.includes(item.sourceDomain) &&
      (!item.pubDateMs || item.pubDateMs >= cutoffMs)
    )

    // ── Score & annotate ──────────────────────────────────────────────────────
    type Scored = {
      item:      RSSItem
      plants:    Array<{ id: string; common_name: string }>
      geoTag:    string | null
      topicChip: { label: string; icon: string } | null
      score:     number
    }

    const scored: Scored[] = filtered.map(item => {
      // Match garden plants in article text (works for both plant & topic articles)
      const matched = plants.filter(p =>
        item.bodyText.includes(p.common_name.toLowerCase()) ||
        (p.botanical_name && item.bodyText.includes(p.botanical_name.toLowerCase()))
      )
      const geo  = geoScore(item.bodyText)
      const base = recencyScore(item.pubDateMs) + geo.score

      // Plant tags win; topic chip only when no plant matched
      const finalTopicChip = matched.length > 0 ? null : item.topicChip

      return {
        item,
        plants:    matched.slice(0, maxTags).map(p => ({ id: p.id, common_name: p.common_name })),
        geoTag:    geo.tag,
        topicChip: finalTopicChip,
        score:     base,
      }
    })

    // Drop items with no plant match AND no topic chip (truly unrelated)
    const relevant = scored.filter(s => s.plants.length > 0 || s.topicChip !== null)
    relevant.sort((a, b) => b.score - a.score)

    // ── Greedy selection with per-plant cap ───────────────────────────────────
    const selected: Scored[] = []
    const plantCounts = new Map<string, number>()

    for (const entry of relevant) {
      if (selected.length >= maxArticles) break
      if (entry.plants.length > 0) {
        const primaryId    = entry.plants[0].id
        const currentCount = plantCounts.get(primaryId) ?? 0
        if (currentCount >= maxPerPlant) continue
        selected.push(entry)
        plantCounts.set(primaryId, currentCount + 1)
      } else {
        // Topic-only articles — no per-plant cap, just add
        selected.push(entry)
      }
    }

    // ── Horizontal floor: ensure ≥ 4 distinct plants where possible ──────────
    const distinctIds = new Set(selected.flatMap(s => s.plants.map(p => p.id)))
    if (distinctIds.size < 4) {
      for (const entry of relevant) {
        if (selected.length >= maxArticles) break
        if (selected.includes(entry)) continue
        const isNew = entry.plants.some(p => !distinctIds.has(p.id))
        if (isNew) {
          selected.push(entry)
          entry.plants.forEach(p => distinctIds.add(p.id))
        }
      }
    }

    return selected.map(({ item, plants: ps, geoTag, topicChip }) => ({
      title:        item.title,
      url:          item.url,
      sourceDomain: item.sourceDomain,
      sourceLabel:  item.sourceLabel,
      pubDate:      item.pubDate,
      pubDateMs:    item.pubDateMs,
      plants:       ps,
      geoTag,
      topicChip,
    }))
  } catch {
    return []
  }
}
