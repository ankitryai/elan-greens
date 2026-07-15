'use client'

import { useState, useMemo } from 'react'
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
}: {
  pins:            { instance: PlantInstance; species: PlantSpecies }[]
  approxPins:      ApproxPin[]
  landmarks:       Landmark[]
  initialCategory: PlantCategory | null
}) {
  const [activeCategory, setActiveCategoryState] = useState<PlantCategory | null>(initialCategory)

  function setActiveCategory(cat: PlantCategory | null) {
    setActiveCategoryState(cat)
    // Persist in URL so browser back from plant details restores the filter
    const url = new URL(window.location.href)
    if (cat) url.searchParams.set('category', cat)
    else url.searchParams.delete('category')
    window.history.replaceState({}, '', url.toString())
  }

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<PlantCategory, number>> = {}
    for (const p of pins)       counts[p.species.category] = (counts[p.species.category] ?? 0) + 1
    for (const p of approxPins) counts[p.species.category] = (counts[p.species.category] ?? 0) + 1
    return counts
  }, [pins, approxPins])

  const filteredPins = useMemo(
    () => activeCategory ? pins.filter(p => p.species.category === activeCategory) : pins,
    [pins, activeCategory]
  )
  const filteredApproxPins = useMemo(
    () => activeCategory ? approxPins.filter(p => p.species.category === activeCategory) : approxPins,
    [approxPins, activeCategory]
  )

  // Deduplicated plant list for the below-map panel (group by species, combine landmarks)
  const plantListItems = useMemo(() => {
    if (!activeCategory) return []
    const bySpecies = new Map<string, { species: PlantSpecies; landmarks: string[] }>()
    for (const ap of filteredApproxPins) {
      if (!bySpecies.has(ap.species.id)) bySpecies.set(ap.species.id, { species: ap.species, landmarks: [] })
      bySpecies.get(ap.species.id)!.landmarks.push(ap.location.landmarkName)
    }
    for (const { species, instance } of filteredPins) {
      if (!bySpecies.has(species.id)) bySpecies.set(species.id, { species, landmarks: [] })
      bySpecies.get(species.id)!.landmarks.push(instance.custom_location_desc ?? 'GPS location')
    }
    return [...bySpecies.values()]
  }, [filteredApproxPins, filteredPins, activeCategory])

  const totalAll = pins.length + approxPins.length

  return (
    <div className="space-y-3">

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !activeCategory ? 'bg-green-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({totalAll})
        </button>
        {CATEGORIES.filter(c => categoryCounts[c]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat ? 'bg-green-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat} ({categoryCounts[cat]})
          </button>
        ))}
      </div>

      {/* Map */}
      <LeafletMap
        key={activeCategory ?? 'all'}
        pins={filteredPins}
        approxPins={filteredApproxPins}
        landmarks={landmarks}
        activeCategory={activeCategory}
      />

      {/* Plant list — only shown when a category is selected */}
      {activeCategory && plantListItems.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            {activeCategory}s on this map · {plantListItems.length} {plantListItems.length === 1 ? 'plant' : 'plants'}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {plantListItems.map(({ species, landmarks: lms }) => (
              <Link
                key={species.id}
                href={`/plants/${species.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 transition-colors"
                style={{ background: 'var(--md-surface-container-lowest)', boxShadow: 'var(--md-elevation-1)' }}
              >
                {/* Thumbnail */}
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
                {/* Info */}
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
                    📍 {lms.join(' · ')}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 opacity-30" aria-hidden>
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
