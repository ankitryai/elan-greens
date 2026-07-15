'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { PlantInstance, PlantSpecies, ApproxPin, Landmark, PlantCategory } from '@/types'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center"
      style={{ height: '65vh' }}
    >
      <p className="text-gray-400 text-sm">Loading map…</p>
    </div>
  ),
})

const CATEGORIES: PlantCategory[] = ['Tree', 'Palm', 'Shrub', 'Herb', 'Creeper', 'Climber', 'Hedge', 'Grass']

export default function MapClient({
  pins,
  approxPins,
  landmarks,
  initialCategory,
  totalSpecies,
}: {
  pins:            { instance: PlantInstance; species: PlantSpecies }[]
  approxPins:      ApproxPin[]
  landmarks:       Landmark[]
  initialCategory: PlantCategory | null
  totalSpecies:    number
}) {
  const [activeCategory, setActiveCategoryState] = useState<PlantCategory | null>(initialCategory)
  // L2 state — which species is drilled into (shows all its landmarks)
  const [activeSpeciesId, setActiveSpeciesId] = useState<string | null>(null)

  function setActiveCategory(cat: PlantCategory | null) {
    setActiveCategoryState(cat)
    setActiveSpeciesId(null) // reset L2 when category changes
    const url = new URL(window.location.href)
    if (cat) url.searchParams.set('category', cat)
    else url.searchParams.delete('category')
    window.history.replaceState({}, '', url.toString())
  }

  // Sync state if initialCategory prop changes (e.g. back-navigation restores a different URL)
  useEffect(() => {
    setActiveCategoryState(initialCategory)
    setActiveSpeciesId(null)
  }, [initialCategory])

  // All unique species that have at least one map pin
  const uniqueSpeciesMap = useMemo(() => {
    const map = new Map<string, PlantSpecies>()
    for (const ap of approxPins) map.set(ap.species.id, ap.species)
    for (const { species } of pins) map.set(species.id, species)
    return map
  }, [approxPins, pins])

  // Chip label counts = unique species per category (not pins)
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<PlantCategory, number>> = {}
    for (const s of uniqueSpeciesMap.values()) {
      counts[s.category] = (counts[s.category] ?? 0) + 1
    }
    return counts
  }, [uniqueSpeciesMap])

  const mappedSpeciesCount = uniqueSpeciesMap.size

  // Category-filtered pools (all landmarks, used for L1 plant list and L2)
  const categoryApproxPins = useMemo(
    () => activeCategory ? approxPins.filter(ap => ap.species.category === activeCategory) : approxPins,
    [approxPins, activeCategory]
  )
  const categoryExactPins = useMemo(
    () => activeCategory ? pins.filter(p => p.species.category === activeCategory) : pins,
    [pins, activeCategory]
  )

  // What the map actually renders:
  // L2 (species selected) → all landmarks for that species
  // L0/L1               → one representative pin per species
  const displayApproxPins = useMemo(() => {
    if (activeSpeciesId) {
      return approxPins.filter(ap => ap.species.id === activeSpeciesId)
    }
    // One pin per species from the category-filtered set (first occurrence = representative)
    const seen = new Set<string>()
    const pool = activeCategory ? categoryApproxPins : approxPins
    return pool.filter(ap => {
      if (seen.has(ap.species.id)) return false
      seen.add(ap.species.id)
      return true
    })
  }, [approxPins, categoryApproxPins, activeCategory, activeSpeciesId])

  const displayExactPins = useMemo(() => {
    if (activeSpeciesId) return pins.filter(p => p.species.id === activeSpeciesId)
    return categoryExactPins
  }, [pins, categoryExactPins, activeSpeciesId])

  // Plant list — shown when a category is active (L1/L2)
  // Each item = one unique species + all its landmark names in that category
  const plantListItems = useMemo(() => {
    if (!activeCategory) return []
    const bySpecies = new Map<string, { species: PlantSpecies; landmarks: string[] }>()
    for (const ap of categoryApproxPins) {
      if (!bySpecies.has(ap.species.id)) bySpecies.set(ap.species.id, { species: ap.species, landmarks: [] })
      bySpecies.get(ap.species.id)!.landmarks.push(ap.location.landmarkName)
    }
    for (const { species, instance } of categoryExactPins) {
      if (!bySpecies.has(species.id)) bySpecies.set(species.id, { species, landmarks: [] })
      bySpecies.get(species.id)!.landmarks.push(instance.custom_location_desc ?? 'GPS location')
    }
    return [...bySpecies.values()]
  }, [categoryApproxPins, categoryExactPins, activeCategory])

  // Map remounts when display set changes (category switch or species drill-in)
  const mapKey = `${activeCategory ?? 'all'}-${activeSpeciesId ?? 'none'}`

  // For L2 — find the selected species object for back-label
  const activeSpecies = activeSpeciesId
    ? plantListItems.find(item => item.species.id === activeSpeciesId)?.species ?? null
    : null

  return (
    <div className="space-y-3">

      {/* Category filter chips — counts are unique species */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !activeCategory ? 'bg-green-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({mappedSpeciesCount})
        </button>
        {CATEGORIES.filter(c => categoryCounts[c]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat ? 'bg-green-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat} ({categoryCounts[cat]})
          </button>
        ))}
      </div>

      {/* Map — remounts on category/species change */}
      <LeafletMap
        key={mapKey}
        pins={displayExactPins}
        approxPins={displayApproxPins}
        landmarks={landmarks}
        activeCategory={activeCategory}
        activeSpeciesId={activeSpeciesId}
      />

      {/* L1 plant list — unique species cards when category is active but no species drilled */}
      {activeCategory && !activeSpeciesId && plantListItems.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            {categoryCounts[activeCategory]} {activeCategory} species · tap to see all locations
          </p>
          <div className="grid grid-cols-1 gap-2">
            {plantListItems.map(({ species, landmarks: lms }) => (
              <button
                key={species.id}
                onClick={() => setActiveSpeciesId(species.id)}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 text-left transition-colors w-full"
                style={{ background: 'var(--md-surface-container-lowest)', boxShadow: 'var(--md-elevation-1)' }}
              >
                {species.img_main_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={species.img_main_url}
                    alt={species.common_name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'var(--md-surface-container)' }}
                  >
                    🌱
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--md-on-surface)' }}>
                    {species.common_name}
                  </p>
                  {species.botanical_name && (
                    <p className="text-xs italic mt-0.5 truncate" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {species.botanical_name}
                    </p>
                  )}
                  <p className="text-xs mt-1 font-medium" style={{ color: '#2E7D32' }}>
                    📍 {lms.length === 1 ? lms[0] : `near ${lms.length} landmarks`}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 opacity-30" aria-hidden>
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* L2 — species drilled in: show its details + all landmarks + back button */}
      {activeSpeciesId && activeSpecies && (
        <div className="space-y-3 pt-1">
          <button
            onClick={() => setActiveSpeciesId(null)}
            className="flex items-center gap-1.5 text-sm text-green-700 font-medium hover:text-green-900"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Back to {activeCategory}s
          </button>

          {/* Selected plant card — links to detail page */}
          {(() => {
            const item = plantListItems.find(i => i.species.id === activeSpeciesId)!
            return (
              <div className="rounded-xl border border-green-200 overflow-hidden"
                style={{ background: 'var(--md-surface-container-lowest)', boxShadow: 'var(--md-elevation-2)' }}>
                {/* Header row */}
                <div className="flex items-center gap-3 p-3">
                  {activeSpecies.img_main_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeSpecies.img_main_url}
                      alt={activeSpecies.common_name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ background: 'var(--md-surface-container)' }}>
                      🌱
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base leading-tight" style={{ color: 'var(--md-on-surface)' }}>
                      {activeSpecies.common_name}
                    </p>
                    {activeSpecies.botanical_name && (
                      <p className="text-xs italic mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {activeSpecies.botanical_name}
                      </p>
                    )}
                    <Link
                      href={`/plants/${activeSpecies.id}`}
                      className="inline-block mt-1.5 text-xs font-semibold text-green-700 hover:underline"
                    >
                      View plant details →
                    </Link>
                  </div>
                </div>
                {/* Landmarks list */}
                <div className="border-t border-gray-100 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                    Look near {item.landmarks.length} {item.landmarks.length === 1 ? 'landmark' : 'landmarks'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.landmarks.map((lm, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-100">
                        📍 {lm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Mapped count footer — only on All view */}
      {!activeCategory && (
        <p className="text-xs text-center text-gray-400 pt-1">
          {mappedSpeciesCount} of {totalSpecies} species mapped · remaining are being documented
        </p>
      )}
    </div>
  )
}
