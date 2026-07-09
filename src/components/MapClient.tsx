'use client'
// WHY a separate client wrapper? Next.js 16 requires `ssr: false` dynamic
// imports to be inside a Client Component, not a Server Component.

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { PlantInstance, PlantSpecies, ApproxPin, Landmark, PlantCategory } from '@/types'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center"
      style={{ height: '72vh' }}
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
}: {
  pins:       { instance: PlantInstance; species: PlantSpecies }[]
  approxPins: ApproxPin[]
  landmarks:  Landmark[]
}) {
  const [activeCategory, setActiveCategory] = useState<PlantCategory | null>(null)

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

  const totalAll = pins.length + approxPins.length

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !activeCategory
              ? 'bg-green-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({totalAll})
        </button>
        {CATEGORIES.filter(c => categoryCounts[c]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(prev => prev === cat ? null : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-green-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat} ({categoryCounts[cat]})
          </button>
        ))}
      </div>
      <LeafletMap
        key={activeCategory ?? 'all'}
        pins={filteredPins}
        approxPins={filteredApproxPins}
        landmarks={landmarks}
      />
    </div>
  )
}
