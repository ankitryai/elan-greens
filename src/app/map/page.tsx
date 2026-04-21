// Map page — fetches all instances + species server-side, renders Leaflet client-side.

import { getAllSpecies, getAllInstances } from '@/lib/queries'
import type { PlantInstance, PlantSpecies } from '@/types'
import MapClient from '@/components/MapClient'

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  const [species, instances] = await Promise.all([getAllSpecies(), getAllInstances()])

  const speciesMap = Object.fromEntries(species.map(s => [s.id, s]))

  const pins: { instance: PlantInstance; species: PlantSpecies }[] = instances
    .filter(i => i.lat && i.lng && speciesMap[i.species_id])
    .map(i => ({ instance: i, species: speciesMap[i.species_id] }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plant Map</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pins.length} plant{pins.length !== 1 ? 's' : ''} mapped · tap a pin for details
        </p>
      </div>
      <MapClient pins={pins} />
    </div>
  )
}
