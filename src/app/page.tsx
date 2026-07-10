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
        className="rounded-[28px] px-6 py-8 relative overflow-hidden"
        style={{ background: 'var(--md-surface-container-low)' }}
      >
        {/* Botanical illustrations — inline SVG, zero network cost */}

        {/* Large tropical leaf — top right, bleeds off card edge */}
        <svg
          className="absolute -top-4 -right-4 w-48 h-56 pointer-events-none select-none"
          viewBox="0 0 192 224" fill="none" aria-hidden="true"
        >
          <path
            d="M175 18 C158 6 130 12 108 28 C82 48 66 80 56 112
               C46 144 44 172 50 200 C78 183 106 154 126 122
               C146 90 164 58 172 34 C177 22 180 17 175 18Z"
            fill="var(--md-primary)" opacity="0.13"
          />
          <path d="M172 20 C128 72 88 136 52 198"
            stroke="var(--md-primary)" strokeWidth="1.5" opacity="0.09" />
          <path d="M148 48 C132 63 116 72 100 76"
            stroke="var(--md-primary)" strokeWidth="1" opacity="0.07" />
          <path d="M134 74 C118 86 103 94 88 96"
            stroke="var(--md-primary)" strokeWidth="1" opacity="0.07" />
          <path d="M118 100 C105 110 92 117 79 118"
            stroke="var(--md-primary)" strokeWidth="1" opacity="0.07" />
          <path d="M102 126 C91 135 80 141 70 141"
            stroke="var(--md-primary)" strokeWidth="1" opacity="0.06" />
        </svg>

        {/* Smaller leaf — bottom right corner */}
        <svg
          className="absolute bottom-0 right-14 w-20 h-28 pointer-events-none select-none"
          viewBox="0 0 80 112" fill="none" aria-hidden="true"
        >
          <path
            d="M65 8 C55 20 40 38 32 60 C24 82 26 100 34 110
               C52 96 64 72 68 48 C72 28 72 12 65 8Z"
            fill="var(--md-primary)" opacity="0.08"
          />
          <path d="M66 10 C52 48 36 84 34 108"
            stroke="var(--md-primary)" strokeWidth="1" opacity="0.06" />
        </svg>

        {/* Tiny accent leaf — top left */}
        <svg
          className="absolute top-5 left-3 w-10 h-14 pointer-events-none select-none"
          viewBox="0 0 40 56" fill="none" aria-hidden="true"
          style={{ transform: 'rotate(-15deg)' }}
        >
          <path
            d="M24 4 C18 12 12 24 10 36 C8 48 12 54 18 56
               C26 48 30 36 30 24 C30 14 28 6 24 4Z"
            fill="var(--md-primary)" opacity="0.07"
          />
        </svg>

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

          {/* Stats chips — only show plants count when instances exist */}
          <div className="flex gap-2.5 flex-wrap mt-4">
            <StatChip value={counts.species} label="species" />
            {counts.instances > 0 && <StatChip value={counts.instances} label="plants" />}
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
