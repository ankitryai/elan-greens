'use client'
// M3 Navigation Bar — mobile only (md:hidden).
// Active indicator: pill behind icon. SVG icons, no emojis.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* ── SVG icon components ── */
function IconLeaf({ active }: { active: boolean }) {
  return active ? (
    // Filled leaf — active state
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 1.83-1.37 3.66-2.58 5-3a6.43 6.43 0 00-5.11 1.11C12.26 4.67 11.2 7 11.2 7c-.54-.42-.93-.94-1.2-1.5C8.69 8.5 8.5 11 8.5 11c-1.29-1.5-1.5-3.5-1.5-3.5C5.5 10 5.5 13 6.5 15c.35.7.84 1.37 1.5 1.96"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden>
      <path d="M11 20A7 7 0 0118 7c0 0-2 2-2 5a5 5 0 01-5 5z"/>
      <path d="M7 17c0-4 4-8 8-10"/>
      <line x1="11" y1="20" x2="11" y2="23"/>
    </svg>
  )
}

function IconMap({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}

function IconTeam({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function IconInfo({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

const NAV = [
  { href: '/',           label: 'Plants',     Icon: IconLeaf },
  { href: '/map',        label: 'Map',        Icon: IconMap  },
  { href: '/green-team', label: 'Green Team', Icon: IconTeam },
  { href: '/about',      label: 'About',      Icon: IconInfo },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-end"
      style={{
        background: 'var(--md-surface-container)',
        boxShadow: '0 -1px 0 var(--md-outline-variant)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center pt-3 pb-4 gap-1 select-none"
            aria-label={label}
          >
            {/* M3 active indicator pill */}
            <span
              className="flex items-center justify-center w-16 h-8 rounded-full transition-all duration-200"
              style={{
                background: active ? 'var(--md-secondary-container)' : 'transparent',
                color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
              }}
            >
              <Icon active={active} />
            </span>
            {/* M3 Label Small */}
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{
                color: active ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
