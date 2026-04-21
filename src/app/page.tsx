import { getAllSpecies, getAllInstances, getSiteCounts, getLastUpdated } from '@/lib/queries'
import { formatDate } from '@/lib/formatters'
import PlantGrid from '@/components/PlantGrid'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [plants, instances, counts, lastUpdated] = await Promise.all([
    getAllSpecies(),
    getAllInstances(),
    getSiteCounts(),
    getLastUpdated(),
  ])

  const instanceCounts: Record<string, number> = {}
  for (const inst of instances) {
    instanceCounts[inst.species_id] = (instanceCounts[inst.species_id] ?? 0) + 1
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ fontFamily: 'Dancing Script, cursive', color: '#2E7D32', fontSize: 32, fontWeight: 700 }}>
          élan greens
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Divyasree Elan Homes · Sarjapur Road, Bengaluru</p>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 flex-wrap text-sm">
        <span className="bg-green-50 text-green-800 px-3 py-1.5 rounded-full font-medium">
          🌿 {counts.species} species
        </span>
        <span className="bg-green-50 text-green-800 px-3 py-1.5 rounded-full font-medium">
          📍 {counts.instances} plants
        </span>
      </div>

      <PlantGrid plants={plants} instanceCounts={instanceCounts} />

      {lastUpdated && (
        <p className="text-xs text-gray-300 text-center pt-2">
          Updated {formatDate(lastUpdated)}
        </p>
      )}
    </div>
  )
}
