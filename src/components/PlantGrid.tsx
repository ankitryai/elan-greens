'use client'
// Client component — search, filter, and sort state lives in the browser.
// All plant data is passed in as a prop from the server-rendered page.tsx.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PlantSpecies, PlantCategory } from '@/types'

const CATEGORIES: PlantCategory[] = ['Tree','Palm','Shrub','Herb','Creeper','Climber','Hedge','Grass']

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const results = plants.filter(p => {
      const matchesSearch =
        !q ||
        p.common_name.toLowerCase().includes(q) ||
        (p.botanical_name?.toLowerCase().includes(q) ?? false) ||
        (p.hindi_name?.toLowerCase().includes(q) ?? false) ||
        (p.kannada_name?.toLowerCase().includes(q) ?? false) ||
        (p.tamil_name?.toLowerCase().includes(q) ?? false)
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })

    if (sort === 'name') {
      results.sort((a, b) => a.common_name.localeCompare(b.common_name))
    } else {
      results.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    }
    return results
  }, [plants, search, activeCategory, sort])

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
          placeholder="Search plants…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--md-on-surface-variant)]"
          style={{ color: 'var(--md-on-surface)' }}
        />
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
        {filtered.map(plant => {
          const tone = CATEGORY_TONES[plant.category]
          return (
            <Link key={plant.id} href={`/plants/${plant.id}`} className="group outline-none">
              <div
                className="rounded-xl overflow-hidden transition-all duration-200 h-full flex flex-col"
                style={{
                  background: 'var(--md-surface-container-lowest)',
                  boxShadow: 'var(--md-elevation-1)',
                }}
                /* Elevation lift on hover via inline style + group class */
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                    'var(--md-elevation-3)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow =
                    'var(--md-elevation-1)'
                }}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-[4/3] relative overflow-hidden"
                  style={{ background: 'var(--md-surface-container-high)' }}
                >
                  {plant.img_main_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plant.img_main_url}
                      alt={plant.common_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ color: 'var(--md-outline-variant)' }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10" aria-hidden>
                        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 1.83-1.37 3.66-2.58 5-3a6.43 6.43 0 00-5.11 1.11C12.26 4.67 11.2 7 11.2 7c-.54-.42-.93-.94-1.2-1.5C8.69 8.5 8.5 11 8.5 11c-1.29-1.5-1.5-3.5-1.5-3.5C5.5 10 5.5 13 6.5 15c.35.7.84 1.37 1.5 1.96"/>
                      </svg>
                    </div>
                  )}
                  {plant.tentative && (
                    <span
                      className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: '#FFF3CD',
                        color: '#7D5A00',
                      }}
                    >
                      TENTATIVE
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <p
                      className="text-sm font-semibold leading-tight line-clamp-1"
                      style={{ color: 'var(--md-on-surface)' }}
                    >
                      {plant.common_name}
                    </p>
                    {plant.botanical_name && (
                      <p
                        className="text-xs italic mt-0.5 line-clamp-1"
                        style={{ color: 'var(--md-on-surface-variant)' }}
                      >
                        {plant.botanical_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: tone.bg, color: tone.text }}
                    >
                      {plant.category}
                    </span>
                    {(instanceCounts[plant.id] ?? 0) > 0 && (
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--md-outline)' }}
                      >
                        {instanceCounts[plant.id]}{' '}
                        {instanceCounts[plant.id] === 1 ? 'location' : 'locations'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-surface-container)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" aria-hidden
              style={{ color: 'var(--md-outline-variant)' }}>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 1.83-1.37 3.66-2.58 5-3a6.43 6.43 0 00-5.11 1.11C12.26 4.67 11.2 7 11.2 7c-.54-.42-.93-.94-1.2-1.5C8.69 8.5 8.5 11 8.5 11c-1.29-1.5-1.5-3.5-1.5-3.5C5.5 10 5.5 13 6.5 15c.35.7.84 1.37 1.5 1.96"/>
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
