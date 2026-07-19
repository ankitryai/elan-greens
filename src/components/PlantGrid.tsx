'use client'
// Client component — search, filter, and sort state lives in the browser.
// All plant data is passed in as a prop from the server-rendered page.tsx.

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { PlantSpecies, PlantCategory } from '@/types'

const CATEGORIES: PlantCategory[] = ['Tree','Palm','Shrub','Herb','Creeper','Climber','Hedge','Grass']

// English filler words that should not be matched against plant fields.
// Without this, "all" matches "balli" (Kannada suffix) and "hymenocallis"
// (botanical name), producing irrelevant results.
const STOP_WORDS = new Set(['all','the','a','an','and','or','of','in','at','to','for','some','any','me','my','us','show','find','get','give','list'])

/* M3 tonal category colours (bg / text) */
const CATEGORY_TONES: Record<PlantCategory, { bg: string; text: string }> = {
  Tree:    { bg: '#C8E6C9', text: '#1B5E20' },
  Palm:    { bg: '#B2EBF2', text: '#006064' },
  Shrub:   { bg: '#DCEDC8', text: '#33691E' },
  Herb:    { bg: '#C8F5E0', text: '#004D35' },
  Creeper: { bg: '#CFE2FF', text: '#003399' },
  Climber: { bg: '#E1BEE7', text: '#4A148C' },
  Hedge:   { bg: '#F0F4C3', text: '#827717' },
  Grass:   { bg: '#FFF9C4', text: '#F57F17' },
}

/* Tonal colours for each regional-language match hint pill */
const HINT_COLORS: Record<string, { bg: string; text: string }> = {
  Hindi:   { bg: '#FFF3E0', text: '#BF360C' },
  Kannada: { bg: '#E0F2F1', text: '#004D40' },
  Tamil:   { bg: '#FCE4EC', text: '#880E4F' },
  Tag:     { bg: '#EDE9FE', text: '#4C1D95' },
}

/* SVG checkmark for active filter chips */
function Checkmark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  )
}

/* SVG search icon */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

/* Leaf placeholder icon */
const LEAF_PATH = "M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 1.83-1.37 3.66-2.58 5-3a6.43 6.43 0 00-5.11 1.11C12.26 4.67 11.2 7 11.2 7c-.54-.42-.93-.94-1.2-1.5C8.69 8.5 8.5 11 8.5 11c-1.29-1.5-1.5-3.5-1.5-3.5C5.5 10 5.5 13 6.5 15c.35.7.84 1.37 1.5 1.96"

export default function PlantGrid({
  plants,
  instanceCounts,
}: {
  plants: PlantSpecies[]
  instanceCounts: Record<string, number>
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<PlantCategory | 'All'>('All')
  const [sort, setSort] = useState<'updated' | 'name'>('updated')
  const [showTip, setShowTip] = useState(() =>
    typeof window === 'undefined' ? true : localStorage.getItem('elan-search-tip-dismissed') !== '1'
  )
  const [listening, setListening] = useState(false)
  const [hasSpeech, setHasSpeech] = useState(false)

  useEffect(() => {
    setHasSpeech('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }, [])

  function startVoice() {
    type SREvent = { results: { [i: number]: { [i: number]: { transcript: string } } } }
    type SRInstance = { lang: string; interimResults: boolean; maxAlternatives: number; onstart: (() => void) | null; onend: (() => void) | null; onresult: ((e: SREvent) => void) | null; start: () => void }
    type SRCtor = { new(): SRInstance }
    const w = window as Window & { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'en-IN'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onstart = () => setListening(true)
    r.onend   = () => setListening(false)
    r.onresult = (e) => setSearch(e.results[0][0].transcript)
    r.start()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    // Strip stop words so "all yellows" → ["yellows"], preventing "all" from
    // substring-matching botanical names like "hymenocallis" or Kannada "-balli".
    const words = q ? q.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w)) : []

    const results = plants.filter(p => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory
      if (!matchesCategory) return false
      if (!q || words.length === 0) return true

      // Flat tokens: named fields + category + each pipe-separated search tag
      const tokens = [
        p.common_name,
        p.botanical_name,
        p.hindi_name,
        p.kannada_name,
        p.tamil_name,
        p.category,
        ...(p.search_tags?.split('|').map(t => t.trim()) ?? []),
      ].filter(Boolean).map(t => t!.toLowerCase())

      // Match if ANY query word hits ANY token in either direction
      // (bidirectional handles plurals: "climbers"⊇"climber", "yellows"⊇"yellow")
      return words.some(word => tokens.some(token => token.includes(word) || word.includes(token)))
    })

    if (sort === 'name') {
      results.sort((a, b) => a.common_name.localeCompare(b.common_name))
    } else {
      // Plants without photos always sink below those with photos; within each
      // group maintain recency order so new additions surface naturally.
      results.sort((a, b) => {
        const aHas = a.img_main_url ? 1 : 0
        const bHas = b.img_main_url ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
      })
    }
    return results
  }, [plants, search, activeCategory, sort])

  // Returns which non-obvious field caused the match so the card can explain it.
  // Returns null when common/botanical name already makes the result self-evident.
  function getMatchHint(p: PlantSpecies): { lang: string; name: string } | null {
    const q = search.toLowerCase().trim()
    if (!q) return null
    const words = q.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w))
    if (words.length === 0) return null
    const hits = (field: string) => words.some(w => field.includes(w) || w.includes(field))

    if (hits(p.common_name.toLowerCase())) return null
    if (p.botanical_name && hits(p.botanical_name.toLowerCase())) return null
    if (p.hindi_name   && hits(p.hindi_name.toLowerCase()))   return { lang: 'Hindi',   name: p.hindi_name }
    if (p.kannada_name && hits(p.kannada_name.toLowerCase())) return { lang: 'Kannada', name: p.kannada_name }
    if (p.tamil_name   && hits(p.tamil_name.toLowerCase()))   return { lang: 'Tamil',   name: p.tamil_name }
    if (p.search_tags) {
      const matched = p.search_tags.split('|').map(t => t.trim()).find(t => hits(t.toLowerCase()))
      if (matched) return { lang: 'Tag', name: matched }
    }
    return null
  }

  return (
    <div className="space-y-4">

      {/* ── M3 Search Bar ── */}
      <div
        className="flex items-center gap-3 px-4 h-14 rounded-full transition-shadow"
        style={{
          background: 'var(--md-surface-container-highest)',
          color: 'var(--md-on-surface-variant)',
          boxShadow: 'none',
        }}
      >
        <SearchIcon />
        <input
          type="search"
          placeholder="English · Hindi · Kannada · Tamil…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--md-on-surface-variant)]"
          style={{ color: 'var(--md-on-surface)' }}
        />
        {hasSpeech && (
          <button
            type="button"
            onClick={startVoice}
            title="Voice search (Indian English)"
            className="shrink-0 transition-opacity"
            style={{
              color: listening ? '#D32F2F' : 'var(--md-on-surface-variant)',
              opacity: listening ? 1 : 0.6,
            }}
            aria-label="Voice search"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </button>
        )}
        {search && (
          <button
            onClick={() => setSearch('')}
            className="w-5 h-5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Clear search"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {/* Search tip — shown when search bar is empty, dismissible */}
      {!search && showTip && (
        <p className="text-xs px-1" style={{ color: 'var(--md-on-surface-variant)' }}>
          💡 Try: &ldquo;white flowers&rdquo;, &ldquo;yellow&rdquo;, &ldquo;climbing vine&rdquo; · Hindi, Kannada, Tamil names work too
          <button
            onClick={() => { setShowTip(false); if (typeof window !== 'undefined') localStorage.setItem('elan-search-tip-dismissed', '1') }}
            className="ml-2 opacity-50 hover:opacity-100 text-[11px]"
          >
            ✕
          </button>
        </p>
      )}

      {/* ── M3 Filter Chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['All', ...CATEGORIES] as const).map(cat => {
          const active = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="m3-state shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors duration-150 border"
              style={
                active
                  ? {
                      background: 'var(--md-secondary-container)',
                      color: 'var(--md-on-secondary-container)',
                      borderColor: 'transparent',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--md-on-surface-variant)',
                      borderColor: 'var(--md-outline-variant)',
                    }
              }
            >
              {active && <Checkmark />}
              {cat}
            </button>
          )
        })}
      </div>

      {/* ── Sort + result count ── */}
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-medium tabular-nums"
          style={{ color: 'var(--md-on-surface-variant)' }}
        >
          {filtered.length} species
        </p>

        {/* M3 Segmented Button */}
        <div
          className="inline-flex rounded-full border overflow-hidden"
          style={{ borderColor: 'var(--md-outline)' }}
          role="group"
          aria-label="Sort order"
        >
          {([
            { key: 'updated', label: 'Recent' },
            { key: 'name',    label: 'A → Z'  },
          ] as const).map((opt, idx) => {
            const active = sort === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`m3-state text-[11px] font-medium px-4 py-1.5 transition-colors duration-150${idx === 0 ? '' : ' border-l'}`}
                style={{
                  background: active ? 'var(--md-secondary-container)' : 'transparent',
                  color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                  borderColor: 'var(--md-outline)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── M3 Elevated Card Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map(plant => (
          <Link key={plant.id} href={`/plants/${plant.id}`} className="group outline-none">
            <PlantCard
              plant={plant}
              instanceCount={instanceCounts[plant.id] ?? 0}
              matchHint={getMatchHint(plant)}
            />
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-surface-container)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" aria-hidden
              style={{ color: 'var(--md-outline-variant)' }}>
              <path d={LEAF_PATH} />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            No plants found
          </p>
        </div>
      )}
    </div>
  )
}

// ── PlantCard — image-fill card with gradient text overlay ───────────────────

function PlantCard({
  plant,
  instanceCount,
  matchHint,
}: {
  plant: PlantSpecies
  instanceCount: number
  matchHint: { lang: string; name: string } | null
}) {
  const tone  = CATEGORY_TONES[plant.category]
  const hintStyle = matchHint ? HINT_COLORS[matchHint.lang] : null
  const hasImg = !!plant.img_main_url

  return (
    <div
      className="rounded-2xl overflow-hidden relative aspect-[3/4] transition-transform duration-200 ease-out group-hover:scale-[1.02] group-active:scale-[0.97]"
      style={{
        background: hasImg ? undefined : 'var(--md-surface-container)',
        boxShadow: 'var(--md-elevation-2)',
      }}
    >
      {/* Full-bleed image */}
      {hasImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={plant.img_main_url!}
          alt={plant.common_name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pb-16"
          style={{ color: 'var(--md-outline-variant)' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14" aria-hidden>
            <path d={LEAF_PATH} />
          </svg>
        </div>
      )}

      {/* Gradient scrim (image only) */}
      {hasImg && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      )}

      {/* Tentative badge — top right */}
      {plant.tentative && (
        <span
          className="absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#FFF3CD', color: '#7D5A00' }}
        >
          TENTATIVE
        </span>
      )}

      {/* Match hint — top left */}
      {matchHint && hintStyle && (
        <span
          className="absolute top-2 left-2 z-10 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: hintStyle.bg, color: hintStyle.text }}
        >
          {matchHint.lang}: {matchHint.name}
        </span>
      )}

      {/* Name / category overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="text-sm font-semibold leading-tight line-clamp-2 drop-shadow-sm"
          style={{ color: hasImg ? '#fff' : 'var(--md-on-surface)' }}
        >
          {plant.common_name}
        </p>
        {plant.botanical_name && (
          <p
            className="text-[11px] italic mt-0.5 line-clamp-1 drop-shadow-sm"
            style={{ color: hasImg ? 'rgba(255,255,255,0.72)' : 'var(--md-on-surface-variant)' }}
          >
            {plant.botanical_name}
          </p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: tone.bg, color: tone.text }}
          >
            {plant.category}
          </span>
          {instanceCount > 0 && (
            <span
              className="text-[10px] drop-shadow-sm"
              style={{ color: hasImg ? 'rgba(255,255,255,0.65)' : 'var(--md-outline)' }}
            >
              {instanceCount} {instanceCount === 1 ? 'loc' : 'locs'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
