// Map page — fetches all instances + species server-side, renders Leaflet client-side.
// Approximate pins are derived by parsing plant interesting_fact text when no GPS exists.

import { getAllSpecies, getAllInstances } from '@/lib/queries'
import { parseLocationFromIF }           from '@/lib/locationParser'
import type { PlantInstance, PlantSpecies } from '@/types'
import type { ApproxLocation }           from '@/lib/locationParser'
import MapClient                          from '@/components/MapClient'

export const dynamic = 'force-dynamic'

export interface ApproxPin {
  species:     PlantSpecies
  location:    ApproxLocation
}

export default async function MapPage() {
  const [species, instances] = await Promise.all([getAllSpecies(), getAllInstances()])

  const speciesMap = Object.fromEntries(species.map(s => [s.id, s]))

  // Species that already have a real GPS pin in plant_instances
  const pinnedSpeciesIds = new Set(
    instances
      .filter(i => i.lat && i.lng && speciesMap[i.species_id])
      .map(i => i.species_id)
  )

  const exactPins: { instance: PlantInstance; species: PlantSpecies }[] = instances
    .filter(i => i.lat && i.lng && speciesMap[i.species_id])
    .map(i => ({ instance: i, species: speciesMap[i.species_id] }))

  // For unpinned species with interesting_fact, parse a location from the text
  const approxPins: ApproxPin[] = species
    .filter(s => !pinnedSpeciesIds.has(s.id) && s.interesting_fact)
    .flatMap(s => {
      const loc = parseLocationFromIF(s.interesting_fact!)
      return loc ? [{ species: s, location: loc }] : []
    })

  const total = exactPins.length + approxPins.length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plant Map</h1>
        <p className="text-sm text-gray-500 mt-1">
          {exactPins.length > 0 && `${exactPins.length} GPS-pinned`}
          {exactPins.length > 0 && approxPins.length > 0 && ' · '}
          {approxPins.length > 0 && `${approxPins.length} approx from description`}
          {total === 0 && '0 plants mapped'}
          {total > 0 && ' · tap a pin for details'}
        </p>
      </div>
      <MapClient pins={exactPins} approxPins={approxPins} />
    </div>
  )
}
