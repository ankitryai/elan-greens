import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import TopNav from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'Elan Greens — Divyasree Elan Homes',
  description: 'Explore the plants, trees, and green team of Divyasree Elan Homes, Sarjapur Road, Bengaluru.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* M3 typography: Playfair Display (display/brand) + Plus Jakarta Sans (body) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TopNav />
        {/* pt-16 on desktop offsets the 64 px fixed TopNav */}
        <main className="max-w-4xl mx-auto px-4 py-5 md:py-8 md:pt-[88px]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
