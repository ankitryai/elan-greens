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
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TopNav />
        <main className="max-w-4xl mx-auto px-4 py-4 md:py-8 md:pt-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
