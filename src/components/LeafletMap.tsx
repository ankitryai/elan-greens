'use client'
// WHY 'use client'? Leaflet requires window/document (browser APIs).
// Dynamic import with ssr:false in MapClient.tsx prevents SSR attempts.

import { useEffect, useRef } from 'react'
import type { PlantInstance, PlantSpecies, ApproxPin } from '@/types'

interface ExactPin { instance: PlantInstance; species: PlantSpecies }

// ── Elan Greens landmark config ───────────────────────────────────────────────
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

const GATES = [
  { name: 'Entry Gate', lat: 12.91749316097813, lng: 77.6727339216401 },
  { name: 'Exit Gate',  lat: 12.91742910987837, lng: 77.6728532799345 },
  { name: 'Back Gate',  lat: 12.91859967382031, lng: 77.6729015596631 },
]

const AMENITIES = [
  { name: 'Badminton',        icon: '🏸', lat: 12.91737094099992,  lng: 77.6735332198749  },
  { name: 'Pool',             icon: '🏊', lat: 12.91771108038718,  lng: 77.6737209744996  },
  { name: 'Cricket',          icon: '🏏', lat: 12.91763629551157,  lng: 77.6730517633802  },
  { name: 'Clubhouse',        icon: '🏠', lat: 12.91795066836152,  lng: 77.6735506542425  },
  { name: 'Grocery',          icon: '🛒', lat: 12.91773367924865,  lng: 77.6734393425718  },
  { name: "Helper's WC",      icon: '🚻', lat: 12.91703499917045,  lng: 77.6740334518334  },
  { name: 'Genset Cage',      icon: '⚡', lat: 12.917548061905524, lng: 77.6743432469792  },
  { name: 'STP',              icon: '💧', lat: 12.917033038420447, lng: 77.67396371442065 },
  { name: '1F Parking Ramp',  icon: '🚗', lat: 12.917383359083345, lng: 77.67417963222587 },
  { name: '2A Parking Ramp',  icon: '🚗', lat: 12.917321922288737, lng: 77.67333607752764 },
  { name: 'Bike Parking',     icon: '🏍', lat: 12.917814396612606, lng: 77.67245228966084 },
]

// ── Confidence → colour ────────────────────────────────────────────────────────
function confColor(c: number): { bg: string; border: string; text: string } {
  if (c >= 0.88) return { bg: 'rgba(200,230,201,0.85)', border: '#2E7D32', text: '#1B5E20' }
  if (c >= 0.72) return { bg: 'rgba(255,243,224,0.88)', border: '#E65100', text: '#BF360C' }
  return                 { bg: 'rgba(252,228,236,0.88)', border: '#880E4F', text: '#880E4F' }
}

// ── Category colour for exact pins ────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; border: string }> = {
  Tree:    { bg: '#C8E6C9', border: '#388E3C' },
  Palm:    { bg: '#B2EBF2', border: '#00838F' },
  Shrub:   { bg: '#DCEDC8', border: '#558B2F' },
  Herb:    { bg: '#C8F5E0', border: '#00695C' },
  Creeper: { bg: '#CFE2FF', border: '#1565C0' },
  Climber: { bg: '#E1BEE7', border: '#6A1B9A' },
  Hedge:   { bg: '#F0F4C3', border: '#9E9D24' },
  Grass:   { bg: '#FFF9C4', border: '#F57F17' },
}

// ── Icon HTML helpers ──────────────────────────────────────────────────────────

function blockHtml(label: string, sub: string) {
  return `<div style="background:rgba(255,255,255,0.92);border:2px solid #2E7D32;border-radius:8px;padding:3px 7px;text-align:center;line-height:1.2;box-shadow:0 1px 4px rgba(0,0,0,0.18);pointer-events:none">
    <div style="font-weight:700;font-size:13px;color:#1B5E20;font-family:Inter,sans-serif">Block ${label}</div>
    ${sub ? `<div style="font-size:10px;color:#4CAF50;font-family:Inter,sans-serif">${sub}</div>` : ''}
  </div>`
}

function gateHtml(name: string) {
  return `<div style="background:#E8F5E9;border:1.5px solid #388E3C;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600;color:#1B5E20;font-family:Inter,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);pointer-events:none">🚪 ${name}</div>`
}

function amenityHtml(icon: string, name: string) {
  return `<div style="background:#FFF8E1;border:1.5px solid #F9A825;border-radius:20px;padding:2px 7px;font-size:10px;font-weight:600;color:#5D4037;font-family:Inter,sans-serif;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.12);pointer-events:none">${icon} ${name}</div>`
}

function exactPinHtml(category: string) {
  const c = CAT_COLORS[category] ?? { bg: '#E8F5E9', border: '#2E7D32' }
  return `<div style="width:28px;height:28px;background:${c.bg};border:2px solid ${c.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,0.2)">🌿</div>`
}

// Approximate pin: dashed border circle with confidence % badge
function approxPinHtml(confidence: number, category: string) {
  const pct = Math.round(confidence * 100)
  const col = confColor(confidence)
  const cat = CAT_COLORS[category] ?? { bg: '#E8F5E9', border: '#2E7D32' }
  return `
  <div style="position:relative;width:36px;height:36px">
    <div style="
      width:32px;height:32px;
      background:${cat.bg};
      border:2.5px dashed ${col.border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:15px;
      box-shadow:0 1px 3px rgba(0,0,0,0.15);
      opacity:0.85;
    ">🌱</div>
    <div style="
      position:absolute;top:-6px;right:-8px;
      background:${col.border};
      color:#fff;
      font-size:8px;font-weight:700;
      font-family:Inter,sans-serif;
      border-radius:8px;
      padding:1px 4px;
      white-space:nowrap;
    ">${pct}%</div>
  </div>`
}

// ── Tiny jitter so multiple plants at same landmark don't fully overlap ────────
function jitter(val: number, idx: number, total: number): number {
  if (total <= 1) return val
  const spread = 0.00012  // ~13 m
  const angle  = (idx / total) * 2 * Math.PI
  return val + (idx % 2 === 0 ? Math.cos(angle) : Math.sin(angle)) * spread * (0.5 + (idx % 3) * 0.25)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LeafletMap({
  pins,
  approxPins,
}: {
  pins: ExactPin[]
  approxPins: ApproxPin[]
}) {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then(L => {
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

      // ── Block labels ────────────────────────────────────────────────────────
      for (const b of BLOCKS) {
        L.marker([b.lat, b.lng], {
          icon: L.divIcon({ html: blockHtml(b.label, b.sub), className: '', iconAnchor: [40, 18] }),
          interactive: false,
          zIndexOffset: 100,
        }).addTo(map)
      }

      // ── Gates ───────────────────────────────────────────────────────────────
      for (const g of GATES) {
        L.marker([g.lat, g.lng], {
          icon: L.divIcon({ html: gateHtml(g.name), className: '', iconAnchor: [36, 12] }),
          interactive: false,
          zIndexOffset: 200,
        }).addTo(map)
      }

      // ── Amenities ───────────────────────────────────────────────────────────
      for (const a of AMENITIES) {
        L.marker([a.lat, a.lng], {
          icon: L.divIcon({ html: amenityHtml(a.icon, a.name), className: '', iconAnchor: [36, 12] }),
          interactive: false,
          zIndexOffset: 200,
        }).addTo(map)
      }

      // ── Exact GPS pins ───────────────────────────────────────────────────────
      for (const { instance, species } of pins) {
        if (!instance.lat || !instance.lng) continue
        const popup = `
          <div style="font-family:Inter,sans-serif;min-width:150px;max-width:220px">
            <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#1B5E20">${species.common_name}</p>
            ${species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 4px">${species.botanical_name}</p>` : ''}
            <span style="display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:10px;padding:1px 6px;border-radius:10px;margin-bottom:4px">${species.category}</span>
            <span style="display:inline-block;background:#E3F2FD;color:#1565C0;font-size:10px;padding:1px 6px;border-radius:10px;margin-bottom:4px;margin-left:3px">📍 GPS</span>
            ${instance.custom_location_desc ? `<p style="font-size:11px;color:#555;margin:4px 0 0">📍 ${instance.custom_location_desc}</p>` : ''}
            ${species.interesting_fact ? `<p style="font-size:11px;color:#555;margin:4px 0 0;font-style:italic">${species.interesting_fact}</p>` : ''}
            <a href="/plants/${species.id}" style="display:inline-block;margin-top:6px;font-size:11px;color:#2E7D32;font-weight:600">View details →</a>
          </div>`
        L.marker([instance.lat, instance.lng], {
          icon: L.divIcon({ html: exactPinHtml(species.category), className: '', iconAnchor: [14, 14] }),
          zIndexOffset: 400,
        }).addTo(map).bindPopup(popup, { maxWidth: 240 })
      }

      // ── Approximate pins (IF-derived) ─────────────────────────────────────
      // Group by landmark key so we can jitter siblings
      const byLandmark = new Map<string, ApproxPin[]>()
      for (const ap of approxPins) {
        const key = `${ap.location.lat.toFixed(5)},${ap.location.lng.toFixed(5)}`
        if (!byLandmark.has(key)) byLandmark.set(key, [])
        byLandmark.get(key)!.push(ap)
      }

      for (const group of byLandmark.values()) {
        group.forEach((ap, idx) => {
          const lat = jitter(ap.location.lat, idx, group.length)
          const lng = jitter(ap.location.lng, idx, group.length)
          const pct = Math.round(ap.location.confidence * 100)
          const col = confColor(ap.location.confidence)

          const popup = `
            <div style="font-family:Inter,sans-serif;min-width:160px;max-width:230px">
              <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#1B5E20">${ap.species.common_name}</p>
              ${ap.species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 4px">${ap.species.botanical_name}</p>` : ''}
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px">
                <span style="background:#E8F5E9;color:#2E7D32;font-size:10px;padding:1px 6px;border-radius:10px">${ap.species.category}</span>
                <span style="background:${col.bg};color:${col.text};border:1px solid ${col.border};font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">~${pct}% match</span>
              </div>
              <p style="font-size:10px;color:#777;margin:0 0 3px">
                📎 Matched: <em>${ap.location.matchedKeyword}</em><br>
                📍 Near: ${ap.location.landmarkName}
              </p>
              ${ap.species.interesting_fact ? `<p style="font-size:11px;color:#444;margin:4px 0;font-style:italic;border-left:2px solid #C8E6C9;padding-left:6px">${ap.species.interesting_fact}</p>` : ''}
              <a href="/plants/${ap.species.id}" style="display:inline-block;margin-top:5px;font-size:11px;color:#2E7D32;font-weight:600">View details →</a>
            </div>`

          L.marker([lat, lng], {
            icon: L.divIcon({
              html: approxPinHtml(ap.location.confidence, ap.species.category),
              className: '',
              iconAnchor: [18, 18],
            }),
            zIndexOffset: 300,
          }).addTo(map).bindPopup(popup, { maxWidth: 250 })
        })
      }

      // Fit to all plant pins if any exist
      const allPinCoords: [number, number][] = [
        ...pins.filter(p => p.instance.lat && p.instance.lng).map(p => [p.instance.lat!, p.instance.lng!] as [number, number]),
        ...approxPins.map(ap => [ap.location.lat, ap.location.lng] as [number, number]),
      ]
      if (allPinCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allPinCoords), { padding: [50, 50] })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  }, [pins, approxPins])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 pb-1">
        <span className="flex items-center gap-1">
          <span style={{ border:'2px solid #2E7D32', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700, color:'#1B5E20' }}>1A</span> Block
        </span>
        <span className="flex items-center gap-1">🚪 Gate</span>
        <span className="flex items-center gap-1">🏸🏊🏏 Amenity</span>
        <span className="flex items-center gap-1">🌿 GPS pin</span>
        <span className="flex items-center gap-1">
          <span style={{ border:'2.5px dashed #2E7D32', borderRadius:'50%', padding:'1px 5px', fontSize:10 }}>🌱</span>
          <span>Approx (from description)</span>
        </span>
        <span className="flex items-center gap-2 ml-2">
          <span style={{ background:'#2E7D32', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:8 }}>88%+</span>
          <span style={{ background:'#E65100', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:8 }}>72–87%</span>
          <span style={{ background:'#880E4F', color:'#fff', fontSize:9, padding:'1px 5px', borderRadius:8 }}>&lt;72%</span>
        </span>
      </div>
      <div ref={mapRef} className="w-full rounded-xl border border-gray-200" style={{ height: '72vh' }} />
    </>
  )
}
