import { getAllStaff } from '@/lib/queries'
import { formatTenure } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

const ROLE_TONES: Record<string, { bg: string; text: string }> = {
  'Head Gardener':      { bg: 'var(--md-primary-container)',   text: 'var(--md-on-primary-container)'   },
  'Assistant Gardener': { bg: 'var(--md-tertiary-container)',  text: 'var(--md-on-tertiary-container)'  },
  'Maintenance Staff':  { bg: 'var(--md-surface-container-highest)', text: 'var(--md-on-surface-variant)' },
}
const DEFAULT_TONE = { bg: 'var(--md-secondary-container)', text: 'var(--md-on-secondary-container)' }

/* Person silhouette SVG icon */
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  )
}

export default async function GreenTeamPage() {
  const staff = await getAllStaff()

  return (
    <div className="space-y-6">

      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--md-on-surface)' }}
        >
          The Green Team
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--md-on-surface-variant)' }}
        >
          The dedicated people who keep Elan Greens beautiful.
        </p>
      </div>

      {staff.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-surface-container)', color: 'var(--md-outline-variant)' }}
          >
            <PersonIcon />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            Coming soon
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {staff.map(member => {
          const tone = ROLE_TONES[member.role] ?? DEFAULT_TONE
          return (
            <div
              key={member.id}
              className="rounded-[20px] p-4 flex gap-4"
              style={{
                background: 'var(--md-surface-container-lowest)',
                boxShadow: 'var(--md-elevation-1)',
              }}
            >
              {/* Photo */}
              <div className="shrink-0">
                {member.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="h-16 w-16 rounded-full object-cover"
                    style={{ border: '2px solid var(--md-outline-variant)' }}
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{
                      background: 'var(--md-secondary-container)',
                      color: 'var(--md-on-secondary-container)',
                    }}
                  >
                    <PersonIcon />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-1.5 min-w-0">
                <p
                  className="font-semibold leading-tight"
                  style={{ color: 'var(--md-on-surface)' }}
                >
                  {member.name}
                </p>
                <span
                  className="inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ background: tone.bg, color: tone.text }}
                >
                  {member.role}
                </span>
                {member.date_of_joining && (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--md-on-surface-variant)' }}
                  >
                    {formatTenure(member.date_of_joining)}
                  </p>
                )}
                {member.speciality && (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--md-on-surface-variant)' }}
                  >
                    Speciality: {member.speciality}
                  </p>
                )}
                {member.tribute_note && (
                  <p
                    className="text-xs italic leading-relaxed pt-0.5"
                    style={{ color: 'var(--md-on-surface-variant)' }}
                  >
                    &ldquo;{member.tribute_note}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
