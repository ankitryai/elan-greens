'use client'
// WHY a separate client wrapper? Next.js 16 requires `ssr: false` dynamic
// imports to be inside a Client Component, not a Server Component.

import dynamic from 'next/dynamic'
import type { PlantInstance, PlantSpecies } from '@/types'
import type { ApproxPin }                  from '@/app/map/page'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center"
      style={{ height: '72vh' }}
    >
      <p className="text-gray-400 text-sm">Loading map…</p>
    </div>
  ),
})

export default function MapClient({
  pins,
  approxPins,
}: {
  pins: { instance: PlantInstance; species: PlantSpecies }[]
  approxPins: ApproxPin[]
}) {
  return <LeafletMap pins={pins} approxPins={approxPins} />
}
