// Shown by Next.js App Router during server-side data fetch on the home page.
export default function Loading() {
  return (
    <div className="space-y-6">

      {/* Hero skeleton */}
      <div
        className="rounded-[28px] px-6 py-8 animate-pulse"
        style={{ background: 'var(--md-surface-container-low)' }}
      >
        <div className="h-9 w-36 rounded-full mb-3" style={{ background: 'var(--md-surface-container-high)' }} />
        <div className="h-4 w-52 rounded-full mb-6" style={{ background: 'var(--md-surface-container-high)' }} />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
          <div className="h-8 w-24 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
        </div>
      </div>

      {/* Search bar */}
      <div
        className="h-14 rounded-full animate-pulse"
        style={{ background: 'var(--md-surface-container-highest)' }}
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden">
        {[56, 40, 62, 50, 72, 58, 46, 54].map((w, i) => (
          <div
            key={i}
            className="h-8 rounded-full shrink-0 animate-pulse"
            style={{ width: w, background: 'var(--md-surface-container)', animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Count + sort row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded-full animate-pulse" style={{ background: 'var(--md-surface-container)' }} />
        <div className="h-7 w-28 rounded-full animate-pulse" style={{ background: 'var(--md-surface-container)' }} />
      </div>

      {/* Card grid — matches aspect-[3/4] of real cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-2xl animate-pulse"
            style={{
              background: 'var(--md-surface-container)',
              animationDelay: `${(i % 6) * 60}ms`,
              boxShadow: 'var(--md-elevation-1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
