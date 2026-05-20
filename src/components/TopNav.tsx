'use client'
// M3 Top App Bar — scroll-aware elevation, active state indicator.
// Needs 'use client' for scroll detection and usePathname.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/',     label: 'Plants' },
  { href: '/map',  label: 'Map'    },
  { href: '/news', label: 'News'   },
  { href: '/about',label: 'About'  },
]

export default function TopNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 items-center px-8 gap-8 transition-all duration-200"
      style={{
        background: scrolled
          ? 'var(--md-surface-container)'
          : 'var(--md-surface)',
        boxShadow: scrolled ? 'var(--md-elevation-2)' : 'none',
      }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2 shrink-0 select-none">
        <span
          style={{
            fontFamily: 'var(--md-font-display)',
            color: 'var(--md-primary)',
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          élan greens
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex gap-1">
        {NAV_LINKS.map(link => {
          const active =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="m3-state relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150"
              style={{
                color: active
                  ? 'var(--md-on-secondary-container)'
                  : 'var(--md-on-surface-variant)',
                background: active
                  ? 'var(--md-secondary-container)'
                  : 'transparent',
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
