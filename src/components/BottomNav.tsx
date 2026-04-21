'use client'
// Mobile-only fixed bottom navigation. Hidden on desktop (md:hidden).

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',           label: 'Plants',     icon: '🌿' },
  { href: '/map',        label: 'Map',        icon: '🗺️' },
  { href: '/green-team', label: 'Green Team', icon: '👷' },
  { href: '/about',      label: 'About',      icon: 'ℹ️' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {NAV.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors
              ${active ? 'text-green-700 font-semibold' : 'text-gray-500'}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
