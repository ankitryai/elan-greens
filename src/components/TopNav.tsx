// Desktop-only top navigation bar. Hidden on mobile (md:flex).

import Link from 'next/link'

export default function TopNav() {
  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm h-14 items-center px-6">
      <Link href="/" className="flex items-center gap-2 mr-10">
        <span style={{ fontFamily: 'Dancing Script, cursive', color: '#2E7D32', fontSize: 26, fontWeight: 700 }}>
          élan greens
        </span>
      </Link>
      <nav className="flex gap-6 text-sm font-medium text-gray-600">
        <Link href="/" className="hover:text-green-700 transition-colors">Plants</Link>
        <Link href="/map" className="hover:text-green-700 transition-colors">Map</Link>
        <Link href="/green-team" className="hover:text-green-700 transition-colors">Green Team</Link>
        <Link href="/about" className="hover:text-green-700 transition-colors">About</Link>
      </nav>
    </header>
  )
}
