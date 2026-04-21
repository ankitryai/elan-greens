'use client'
// WHY 'use client'? Leaflet requires window/document (browser APIs).
// Dynamic import with ssr:false in map/page.tsx prevents SSR attempts.

import { useEffect, useRef } from 'react'
import type { PlantInstance, PlantSpecies } from '@/types'

interface Pin {
  instance: PlantInstance
  species: PlantSpecies
}

export default function LeafletMap({ pins }: { pins: Pin[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamically import Leaflet so it only runs in the browser
    import('leaflet').then(L => {
      // Fix default marker icon paths (Leaflet webpack issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([12.9182, 77.6735], 17)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map)

      for (const { instance, species } of pins) {
        if (!instance.lat || !instance.lng) continue
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:140px">
            <p style="font-weight:600;margin:0 0 2px">${species.common_name}</p>
            ${species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 4px">${species.botanical_name}</p>` : ''}
            ${instance.custom_location_desc ? `<p style="font-size:12px;color:#444;margin:0 0 4px">📍 ${instance.custom_location_desc}</p>` : ''}
            <a href="/plants/${species.id}" style="font-size:12px;color:#2E7D32">View details →</a>
          </div>
        `
        L.marker([instance.lat, instance.lng]).addTo(map).bindPopup(popup)
      }

      // Fit bounds to all pins if there are any
      const validPins = pins.filter(p => p.instance.lat && p.instance.lng)
      if (validPins.length > 1) {
        const bounds = L.latLngBounds(validPins.map(p => [p.instance.lat!, p.instance.lng!]))
        map.fitBounds(bounds, { padding: [30, 30] })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  }, [pins])

  return (
    <>
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full rounded-xl border border-gray-200" style={{ height: '70vh' }} />
    </>
  )
}
