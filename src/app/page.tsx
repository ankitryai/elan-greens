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
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div
        className="rounded-[28px] px-6 py-7 relative overflow-hidden"
        style={{ background: 'var(--md-surface-container-low)' }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'var(--md-primary)' }}
        />
        <div className="relative">
          <h1
            style={{
              fontFamily: 'var(--md-font-display)',
              color: 'var(--md-primary)',
              fontSize: 'clamp(2rem, 6vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            élan greens
          </h1>
          <p
            className="mt-1.5 text-sm font-medium"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            Divyasree Elan Homes · Sarjapur Road, Bengaluru
          </p>

          {/* Stats chips */}
          <div className="flex gap-2.5 flex-wrap mt-4">
            <StatChip value={counts.species} label="species" />
            <StatChip value={counts.instances} label="plants" />
          </div>
        </div>
      </div>

      <PlantGrid plants={plants} instanceCounts={instanceCounts} />

      {lastUpdated && (
        <p
          className="text-xs text-center pt-2 pb-1"
          style={{ color: 'var(--md-outline)' }}
        >
          Updated {formatDate(lastUpdated)}
        </p>
      )}
    </div>
  )
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium"
      style={{
        background: 'var(--md-primary-container)',
        color: 'var(--md-on-primary-container)',
      }}
    >
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  )
}
