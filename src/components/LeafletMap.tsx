'use client'

import { useEffect, useRef } from 'react'
import type { PlantInstance, PlantSpecies, ApproxPin, Landmark } from '@/types'

interface ExactPin { instance: PlantInstance; species: PlantSpecies }

// ── Category colour for plant pins ────────────────────────────────────────────
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

function blockHtml(label: string, sub: string | null) {
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

function exactPinHtml(_category: string) {
  // GPS-exact pin — blue accent to distinguish from landmark-tagged
  return `<div style="width:28px;height:28px;background:#E3F2FD;border:2.5px solid #0288D1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.2)">🌿</div>`
}

function approxPinHtml(confidence: number, _category: string) {
  const isTagged = confidence >= 1.0
  // All plant pins use the same green — no per-category color to avoid purple/teal confusion.
  // Solid green border = landmark-tagged (confident). Dashed grey = approximate/NLP.
  const badge = isTagged
    ? `<div style="position:absolute;top:-5px;right:-7px;background:#2E7D32;color:#fff;font-size:9px;font-weight:700;border-radius:8px;padding:1px 3px;line-height:1.4">📍</div>`
    : ''
  return `
    <div style="position:relative;width:36px;height:36px">
      <div style="
        width:32px;height:32px;
        background:#E8F5E9;
        border:2.5px ${isTagged ? 'solid' : 'dashed'} ${isTagged ? '#2E7D32' : '#888'};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:15px;
        box-shadow:0 1px 3px rgba(0,0,0,0.15);
        opacity:${isTagged ? 1 : 0.75};
      ">🌱</div>
      ${badge}
    </div>`
}

function landmarkHtml(lm: Landmark): { html: string; anchor: [number, number] } {
  if (lm.category === 'Block') {
    const label = lm.name.replace(/^Block\s+/i, '')
    return { html: blockHtml(label, lm.sub_label), anchor: [40, 18] }
  }
  if (lm.category === 'Gate') {
    return { html: gateHtml(lm.name), anchor: [36, 12] }
  }
  return { html: amenityHtml(lm.icon ?? '📍', lm.name), anchor: [36, 12] }
}

// ── Tiny jitter so overlapping pins at the same landmark spread slightly ───────
function jitter(val: number, idx: number, total: number): number {
  if (total <= 1) return val
  const spread = 0.00012
  const angle  = (idx / total) * 2 * Math.PI
  return val + (idx % 2 === 0 ? Math.cos(angle) : Math.sin(angle)) * spread * (0.5 + (idx % 3) * 0.25)
}

// ── Popup HTML builders ────────────────────────────────────────────────────────

function buildApproxPopup(ap: ApproxPin): string {
  const isTagged = ap.location.confidence >= 1.0
  const thumb = ap.species.img_main_url
    ? `<img src="${ap.species.img_main_url}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;display:block">`
    : ''
  const locationLine = isTagged
    ? `<p style="font-size:11px;color:#2E7D32;margin:4px 0 0;font-weight:600">📍 ${ap.location.landmarkName}</p>`
    : `<p style="font-size:11px;color:#666;margin:4px 0 0">Near: ${ap.location.landmarkName}</p>`
  // Whole card is an <a> so tapping anywhere navigates — better mobile UX
  return `
    <a href="/plants/${ap.species.id}" style="font-family:Inter,sans-serif;min-width:160px;max-width:210px;display:block;text-decoration:none;color:inherit;cursor:pointer">
      ${thumb}
      <p style="font-weight:700;font-size:13px;margin:0 0 1px;color:#1B5E20">${ap.species.common_name}</p>
      ${ap.species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 4px">${ap.species.botanical_name}</p>` : ''}
      <span style="background:#E8F5E9;color:#2E7D32;font-size:10px;padding:1px 6px;border-radius:10px">${ap.species.category}</span>
      ${locationLine}
      <p style="margin-top:7px;font-size:11px;color:#2E7D32;font-weight:600">View details →</p>
    </a>`
}

function buildExactPopup(instance: PlantInstance, species: PlantSpecies): string {
  const thumb = species.img_main_url
    ? `<img src="${species.img_main_url}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;display:block">`
    : ''
  return `
    <a href="/plants/${species.id}" style="font-family:Inter,sans-serif;min-width:160px;max-width:210px;display:block;text-decoration:none;color:inherit;cursor:pointer">
      ${thumb}
      <p style="font-weight:700;font-size:13px;margin:0 0 1px;color:#1B5E20">${species.common_name}</p>
      ${species.botanical_name ? `<p style="font-style:italic;color:#666;font-size:11px;margin:0 0 4px">${species.botanical_name}</p>` : ''}
      <span style="background:#E8F5E9;color:#2E7D32;font-size:10px;padding:1px 6px;border-radius:10px">${species.category}</span>
      ${instance.custom_location_desc ? `<p style="font-size:11px;color:#555;margin:4px 0 0">📍 ${instance.custom_location_desc}</p>` : ''}
      <p style="margin-top:7px;font-size:11px;color:#2E7D32;font-weight:600">View details →</p>
    </a>`
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LeafletMap({
  pins,
  approxPins,
  landmarks,
  activeCategory,
  activeSpeciesId,
}: {
  pins:            ExactPin[]
  approxPins:      ApproxPin[]
  landmarks:       Landmark[]
  activeCategory?: string | null
  activeSpeciesId?: string | null
}) {
  const mapRef         = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dim landmarks that have no plant of the active category (or species) nearby
    const activeLandmarkNames = (activeCategory || activeSpeciesId)
      ? new Set(approxPins.map(ap => ap.location.landmarkName))
      : null

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

      // ── Landmark overlay ─────────────────────────────────────────────────────
      const ORDER = ['Block', 'Gate', 'Sports', 'Amenity', 'Infrastructure', 'Green Space']
      const sorted = [...landmarks].sort(
        (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category)
      )
      for (const lm of sorted) {
        const { html, anchor } = landmarkHtml(lm)
        // Dim landmarks that have no plant of the active category near them
        const isRelevant = !activeLandmarkNames || activeLandmarkNames.has(lm.name)
        const opacity = isRelevant ? 1 : 0.18
        const wrappedHtml = `<div style="opacity:${opacity};transition:opacity 0.2s">${html}</div>`
        L.marker([lm.lat, lm.lng], {
          icon: L.divIcon({ html: wrappedHtml, className: '', iconAnchor: anchor }),
          interactive: false,
          zIndexOffset: lm.category === 'Block' ? 100 : 200,
        }).addTo(map)
      }

      // ── Exact GPS pins ───────────────────────────────────────────────────────
      for (const { instance, species } of pins) {
        if (!instance.lat || !instance.lng) continue
        L.marker([instance.lat, instance.lng], {
          icon: L.divIcon({ html: exactPinHtml(species.category), className: '', iconAnchor: [14, 14] }),
          zIndexOffset: 400,
        }).addTo(map).bindPopup(buildExactPopup(instance, species), { maxWidth: 230 })
      }

      // ── Approx / landmark-tagged pins ────────────────────────────────────────
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
          L.marker([lat, lng], {
            icon: L.divIcon({
              html: approxPinHtml(ap.location.confidence, ap.species.category),
              className: '',
              iconAnchor: [18, 18],
            }),
            zIndexOffset: 300,
          }).addTo(map).bindPopup(buildApproxPopup(ap), { maxWidth: 230 })
        })
      }

      // Fit map to all plant pins
      const allCoords: [number, number][] = [
        ...pins.filter(p => p.instance.lat && p.instance.lng).map(p => [p.instance.lat!, p.instance.lng!] as [number, number]),
        ...approxPins.map(ap => [ap.location.lat, ap.location.lng] as [number, number]),
      ]
      if (allCoords.length > 1) {
        map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  }, [pins, approxPins, landmarks, activeCategory, activeSpeciesId])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      {/* Map legend — only show marker types actually in use */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pb-1">
        <span className="flex items-center gap-1">
          <span style={{ border:'2px solid #2E7D32', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700, color:'#1B5E20' }}>1A</span> Block
        </span>
        <span className="flex items-center gap-1">🚪 Gate</span>
        <span className="flex items-center gap-1">🎾🏊 Amenity</span>
        <span className="flex items-center gap-1">
          <span style={{ background:'#E8F5E9', border:'2px solid #2E7D32', borderRadius:'50%', padding:'1px 5px', fontSize:10 }}>🌱</span> Plant
        </span>
      </div>
      <div ref={mapRef} className="w-full rounded-xl border border-gray-200" style={{ height: '65vh' }} />
    </>
  )
}
