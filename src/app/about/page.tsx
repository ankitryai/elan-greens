import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-lg">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--md-on-surface)' }}>
          About Elan Greens
        </h1>
      </div>

      <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--md-on-surface-variant)' }}>
        <p>
          <strong style={{ color: 'var(--md-on-surface)' }}>Divyasree Elan Homes</strong> is a
          residential community on Sarjapur Road, Bengaluru, surrounded by thoughtfully planted
          trees, shrubs, and flowering plants that make everyday life greener and more peaceful.
        </p>
        <p>
          <strong style={{ color: 'var(--md-on-surface)' }}>Elan Greens</strong> is a living
          directory of every plant species found within the society — their names in multiple
          languages, ecological properties, locations, and the stories behind them.
        </p>
      </div>

      {/* Green Team CTA — replaces the nav entry */}
      <Link
        href="/green-team"
        className="m3-state flex items-center gap-4 rounded-[20px] p-4 transition-all duration-200"
        style={{
          background: 'var(--md-secondary-container)',
          color: 'var(--md-on-secondary-container)',
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16,31,14,0.15)' }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"
            style={{ color: 'var(--md-on-secondary-container)' }}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--md-on-secondary-container)' }}>
            Meet the Green Team
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--md-on-secondary-container)', opacity: 0.8 }}>
            The dedicated gardeners who nurture this space every day
          </p>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0 ml-auto"
          style={{ color: 'var(--md-on-secondary-container)' }} aria-hidden>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </Link>

      {/* How data is collected */}
      <div
        className="rounded-[16px] p-4 space-y-1.5"
        style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
      >
        <p className="text-sm font-semibold">How data is collected</p>
        <p className="text-sm opacity-90">
          Plants are identified using AI (Plant.id) and verified by the society admin.
          Species marked <span className="font-semibold">TENTATIVE</span> are AI-suggested
          and pending manual verification.
        </p>
      </div>

      <div className="text-xs space-y-1 pt-2" style={{ color: 'var(--md-outline)' }}>
        <p>Plant images sourced from Wikimedia Commons under their respective open licences.</p>
        <p>Plant identification powered by Plant.id and Google Cloud Vision.</p>
        <p>Maps powered by OpenStreetMap contributors.</p>
        <p className="pt-2" style={{ color: 'var(--md-primary)' }}>Built with ♥ for the Elan community.</p>
      </div>
    </div>
  )
}
