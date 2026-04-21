'use client'
// Client component so search and filter state live in the browser.
// All plant data is passed in as a prop — fetched server-side in page.tsx.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PlantSpecies, PlantCategory } from '@/types'

const CATEGORIES: PlantCategory[] = ['Tree','Palm','Shrub','Herb','Creeper','Climber','Hedge','Grass']

const CATEGORY_COLORS: Record<PlantCategory, string> = {
  Tree:    'bg-green-100 text-green-800',
  Palm:    'bg-teal-100 text-teal-800',
  Shrub:   'bg-lime-100 text-lime-800',
  Herb:    'bg-emerald-100 text-emerald-800',
  Creeper: 'bg-cyan-100 text-cyan-800',
  Climber: 'bg-sky-100 text-sky-800',
  Hedge:   'bg-green-100 text-green-700',
  Grass:   'bg-yellow-100 text-yellow-800',
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return plants.filter(p => {
      const matchesSearch = !q
        || p.common_name.toLowerCase().includes(q)
        || (p.botanical_name?.toLowerCase().includes(q) ?? false)
        || (p.hindi_name?.toLowerCase().includes(q) ?? false)
        || (p.kannada_name?.toLowerCase().includes(q) ?? false)
        || (p.tamil_name?.toLowerCase().includes(q) ?? false)
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [plants, search, activeCategory])

  return (
    <div className="space-y-4">

      {/* Search */}
      <input
        type="search"
        placeholder="Search plants…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
      />

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['All', ...CATEGORIES] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${activeCategory === cat
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-400">
        {filtered.length} {filtered.length === 1 ? 'species' : 'species'} found
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map(plant => (
          <Link key={plant.id} href={`/plants/${plant.id}`}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-gray-100 relative">
                {plant.img_main_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={plant.img_main_url}
                    alt={plant.common_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
                )}
                {plant.tentative && (
                  <span className="absolute top-1.5 right-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    TENTATIVE
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1">
                <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">
                  {plant.common_name}
                </p>
                {plant.botanical_name && (
                  <p className="text-xs italic text-gray-400 line-clamp-1">{plant.botanical_name}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[plant.category]}`}>
                    {plant.category}
                  </span>
                  {(instanceCounts[plant.id] ?? 0) > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {instanceCounts[plant.id]} location{instanceCounts[plant.id] !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-12 text-gray-400 text-sm">No plants found.</p>
      )}
    </div>
  )
}
