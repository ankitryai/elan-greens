'use client'
// WHY 'use client'? Leaflet requires window/document (browser APIs).
// Dynamic import with ssr:false in MapClient.tsx prevents SSR attempts.

import { useEffect, useRef } from 'react'
import type { PlantInstance, PlantSpecies } from '@/types'

interface Pin {
  instance: PlantInstance
  species: PlantSpecies
}

// ── Elan Greens landmark config ───────────────────────────────────────────────
// Centroids for each residential block — rendered as labelled area markers.
const BLOCKS = [
  { label: '1A', sub: 'Caldra',  lat: 12.91783433084684, lng: 77.6726333387974 },
  { label: '1B', sub: 'Clayton', lat: 12.91823040103564, lng: 77.6728251167359 },
  { label: '1C', sub: 'Senswe',  lat: 12.91820621854118, lng: 77.6732703634155 },
  { label: '1D', sub: 'Sesna',   lat: 12.91798400099841, lng: 77.6736767180608 },
  { label: '1E', sub: 'Pratle',  lat: 12.91766766745733, lng: 77.6740133352728 },
  { label: '1F', sub: 'Raxton',  lat: 12.91731081136661, lng: 77.6738497205344 },
  { label: '1G', sub: 'Dyna',    lat: 12.91841928576080, lng: 77.6730973609282 },
  { label: '1H', sub: '',        lat: 12.91789903541721, lng: 77.6739811487665 },
  { label: '2A', sub: 'Sanster', lat: 12.91748205006520, lng: 77.6731751449919 },
]

// Key gates — rendered as small pill markers.
const GATES = [
  { name: 'Entry Gate', lat: 12.91749316097813, lng: 77.6727339216401 },
  { name: 'Exit Gate',  lat: 12.91742910987837, lng: 77.6728532799345 },
  { name: 'Back Gate',  lat: 12.91859967382031, lng: 77.6729015596631 },
]

// Amenities — rendered with emoji icons.
const AMENITIES = [
  { name: 'Badminton',  icon: '🏸', lat: 12.91737094099992, lng: 77.6735332198749 },
  { name: 'Pool',       icon: '🏊', lat: 12.91771108038718, lng: 77.6737209744996 },
  { name: 'Cricket',    icon: '🏏', lat: 12.91763629551157, lng: 77.6730517633802 },
  { name: 'Clubhouse',  icon: '🏠', lat: 12.91795066836152, lng: 77.6735506542425 },
  { name: 'Grocery',    icon: '🛒', lat: 12.91773367924865, lng: 77.6734393425718 },
  { name: "Helper's WC", icon: '🚻', lat: 12.91703499917045, lng: 77.6740334518334 },
]

// ── Icon HTML factories ───────────────────────────────────────────────────────

function blockIconHtml(label: string, sub: string): string {
  return `
    <div style="
      background:rgba(255,255,255,0.92);
      border:2px solid #2E7D32;
      border-radius:8px;
      padding:3px 7px;
      text-align:center;
      line-height:1.2;
      box-shadow:0 1px 4px rgba(0,0,0,0.18);
      pointer-events:none;
    ">
      <div style="font-weight:700;font-size:13px;color:#1B5E20;font-family:Inter,sans-serif">Block ${label}</div>
      ${sub ? `<div style="font-size:10px;color:#4CAF50;font-family:Inter,sans-serif">${sub}</div>` : ''}
    </div>`
}

function gateIconHtml(name: string): string {
  return `
    <div style="
      background:#E8F5E9;
      border:1.5px solid #388E3C;
      border-radius:20px;
      padding:2px 8px;
      font-size:10px;
      font-weight:600;
      color:#1B5E20;
      font-family:Inter,sans-serif;
      white-space:nowrap;
      box-shadow:0 1px 3px rgba(0,0,0,0.15);
      pointer-events:none;
    ">🚪 ${name}</div>`
}

function amenityIconHtml(icon: string, name: string): string {
  return `
    <div style="
      background:#FFF8E1;
      border:1.5px solid #F9A825;
      border-radius:20px;
      padding:2px 7px;
      font-size:10px;
      font-weight:600;
      color:#5D4037;
      font-family:Inter,sans-serif;
      white-space:nowrap;
      box-shadow:0 1px 3px rgba(0,0,0,0.12);
      pointer-events:none;
    ">${icon} ${name}</div>`
}

function plantIconHtml(category: string): string {
  const colors: Record<string, { bg: string; border: string }> = {
    Tree:    { bg: '#C8E6C9', border: '#388E3C' },
    Palm:    { bg: '#B2EBF2', border: '#00838F' },
    Shrub:   { bg: '#DCEDC8', border: '#558B2F' },
    Herb:    { bg: '#C8F5E0', border: '#00695C' },
    Creeper: { bg: '#CFE2FF', border: '#1565C0' },
    Climber: { bg: '#E1BEE7', border: '#6A1B9A' },
    Hedge:   { bg: '#F0F4C3', border: '#9E9D24' },
    Grass:   { bg: '#FFF9C4', border: '#F57F17' },
  }
  const c = colors[category] ?? { bg: '#E8F5E9', border: '#2E7D32' }
  return `
    <div style="
      width:28px;height:28px;
      background:${c.bg};
      border:2px solid ${c.border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
    ">🌿</div>`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeafletMap({ pins }: { pins: Pin[] }) {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
      // Fix default marker icon paths (Leaflet webpack issue)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([12.9179, 77.6733], 17)
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map)

      // ── Block labels ──────────────────────────────────────────────────────
      for (const b of BLOCKS) {
        L.marker([b.lat, b.lng], {
          icon: L.divIcon({
            html: blockIconHtml(b.label, b.sub),
            className: '',
            iconAnchor: [40, 18],
          }),
          interactive: false,
          zIndexOffset: 100,
        }).addTo(map)
      }

      // ── Gate markers ──────────────────────────────────────────────────────
      for (const g of GATES) {
        L.marker([g.lat, g.lng], {
          icon: L.divIcon({
            html: gateIconHtml(g.name),
            className: '',
            iconAnchor: [36, 12],
          }),
          interactive: false,
          zIndexOffset: 200,
        }).addTo(map)
      }

      // ── Amenity markers ───────────────────────────────────────────────────
      for (const a of AMENITIES) {
        L.marker([a.lat, a.lng], {
          icon: L.divIcon({
            html: amenityIconHtml(a.icon, a.name),
            className: '',
            iconAnchor: [36, 12],
          }),
          interactive: false,
          zIndexOffset: 200,
        }).addTo(map)
      }

      // ── Plant pins ────────────────────────────────────────────────────────
      for (const { instance, species } of pins) {
        if (!instance.lat || !instance.lng) continue
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:150px;max-width:220px">
            <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#1B5E20">${species.common_name}</p>
            ${species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 5px">${species.botanical_name}</p>` : ''}
            <span style="display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:10px;padding:1px 6px;border-radius:10px;margin-bottom:5px">${species.category}</span>
            ${instance.custom_location_desc ? `<p style="font-size:11px;color:#555;margin:4px 0 0">📍 ${instance.custom_location_desc}</p>` : ''}
            ${species.interesting_fact ? `<p style="font-size:11px;color:#555;margin:4px 0 0;font-style:italic">${species.interesting_fact}</p>` : ''}
            <a href="/plants/${species.id}" style="display:inline-block;margin-top:6px;font-size:11px;color:#2E7D32;font-weight:600">View details →</a>
          </div>
        `
        L.marker([instance.lat, instance.lng], {
          icon: L.divIcon({
            html: plantIconHtml(species.category),
            className: '',
            iconAnchor: [14, 14],
          }),
          zIndexOffset: 300,
        }).addTo(map).bindPopup(popup, { maxWidth: 240 })
      }

      // Fit to plant pins if any exist; otherwise centre on Elan complex
      const validPins = pins.filter(p => p.instance.lat && p.instance.lng)
      if (validPins.length > 1) {
        const bounds = L.latLngBounds(validPins.map(p => [p.instance.lat!, p.instance.lng!]))
        map.fitBounds(bounds, { padding: [40, 40] })
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
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600 pb-1">
        <span className="flex items-center gap-1"><span style={{ border:'2px solid #2E7D32', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700, color:'#1B5E20' }}>1A</span> Block</span>
        <span className="flex items-center gap-1">🚪 Gate</span>
        <span className="flex items-center gap-1">🏸🏊🏏🏠 Amenity</span>
        <span className="flex items-center gap-1">🌿 Plant</span>
      </div>
      <div ref={mapRef} className="w-full rounded-xl border border-gray-200" style={{ height: '72vh' }} />
    </>
  )
}
