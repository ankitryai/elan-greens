// Map page — fetches landmarks, plant-landmark tags, instances + species server-side.
// DB-tagged plants get exact landmark pins (confidence=1.0).
// Untagged plants with interesting_fact fall back to NLP parsing.

import { getAllSpecies, getAllInstances, getLandmarks, getPlantLandmarkTags, getPlantLocationInfo } from '@/lib/queries'
import { parseLocationFromIF } from '@/lib/locationParser'
import type { PlantInstance, PlantSpecies, ApproxPin, Landmark, PlantCategory } from '@/types'
import MapClient from '@/components/MapClient'

export const dynamic = 'force-dynamic'

function categoryToLocationType(category: string): ApproxPin['location']['locationType'] {
  if (category === 'Block') return 'block_centroid'
  if (category === 'Gate')  return 'gate'
  return 'amenity'
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const CATEGORIES: PlantCategory[] = ['Tree','Palm','Shrub','Herb','Creeper','Climber','Hedge','Grass']
  const initialCategory: PlantCategory | null =
    CATEGORIES.includes(category as PlantCategory) ? (category as PlantCategory) : null
  const [species, instances, landmarks, landmarkTags, locationInfoRows] = await Promise.all([
    getAllSpecies(),
    getAllInstances(),
    getLandmarks('elan'),
    getPlantLandmarkTags(),
    getPlantLocationInfo('elan'),
  ])

  const speciesLocationMap = Object.fromEntries(
    locationInfoRows.map(r => [r.species_id, r.location_info])
  )

  const speciesMap    = Object.fromEntries(species.map(s => [s.id, s]))
  const landmarkMap   = Object.fromEntries(landmarks.map(l => [l.id, l]))

  // Species that already have a real GPS pin in plant_instances
  const pinnedSpeciesIds = new Set(
    instances
      .filter(i => i.lat && i.lng && speciesMap[i.species_id])
      .map(i => i.species_id)
  )

  const exactPins: { instance: PlantInstance; species: PlantSpecies }[] = instances
    .filter(i => i.lat && i.lng && speciesMap[i.species_id])
    .map(i => ({ instance: i, species: speciesMap[i.species_id] }))

  // Build species → landmark list from DB tags
  const speciesLandmarks: Record<string, Landmark[]> = {}
  for (const tag of landmarkTags) {
    const lm = landmarkMap[tag.landmark_id]
    if (!lm) continue
    if (!speciesLandmarks[tag.species_id]) speciesLandmarks[tag.species_id] = []
    speciesLandmarks[tag.species_id].push(lm)
  }

  // DB-tagged plants (confidence=1.0) — one pin per tagged landmark
  const taggedPins: ApproxPin[] = species
    .filter(s => !pinnedSpeciesIds.has(s.id) && speciesLandmarks[s.id]?.length > 0)
    .flatMap(s =>
      speciesLandmarks[s.id].map(lm => ({
        species: s,
        location: {
          landmarkName:  lm.name,
          lat:           lm.lat,
          lng:           lm.lng,
          confidence:    1.0,
          matchedKeyword: 'Tagged location',
          locationType:  categoryToLocationType(lm.category),
        },
      }))
    )

  // NLP fallback for species with no GPS and no DB tag
  // Uses plant_location_info (property-scoped) instead of the global interesting_fact
  const taggedSpeciesIds = new Set(Object.keys(speciesLandmarks))
  const nlpPins: ApproxPin[] = species
    .filter(s => !pinnedSpeciesIds.has(s.id) && !taggedSpeciesIds.has(s.id) && (speciesLocationMap[s.id] || s.interesting_fact))
    .flatMap(s => {
      const text = speciesLocationMap[s.id] ?? s.interesting_fact!
      const loc = parseLocationFromIF(text)
      return loc ? [{ species: s, location: loc }] : []
    })

  const approxPins = [...taggedPins, ...nlpPins]

  // Count unique species that actually appear on the map
  const mappedSpeciesIds = new Set([
    ...exactPins.map(p => p.species.id),
    ...approxPins.map(ap => ap.species.id),
  ])
  const mappedCount = mappedSpeciesIds.size
  const unmappedCount = species.length - mappedCount

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plant Map</h1>
        <p className="text-sm text-gray-500 mt-1">
          {mappedCount} species mapped
          {unmappedCount > 0 && ` · ${unmappedCount} more being documented`}
          {' · tap a plant to find it'}
        </p>
      </div>
      <MapClient
        key={initialCategory ?? 'all'}
        pins={exactPins}
        approxPins={approxPins}
        landmarks={landmarks}
        initialCategory={initialCategory}
      />
    </div>
  )
}
