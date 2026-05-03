'use client'
// =============================================================================
// SubImageGallery — clickable thumbnails with full-screen lightbox.
//
// WHY React Portal + z-[9999]?
// Both TopNav and BottomNav use z-50. Rendering the overlay as a sibling in
// the normal document flow means it shares the same stacking context and the
// nav bars sit on top of it — clicks on the overlay fall through to nav links
// on mobile. createPortal() attaches the overlay directly to <body>, outside
// any parent stacking context, so z-[9999] is unambiguously the topmost layer.
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface SubImage {
  url:   string
  attr?: string | null
  label: string
}

export default function SubImageGallery({ images }: { images: SubImage[] }) {
  const [selected, setSelected]   = useState<SubImage | null>(null)
  const [mounted,  setMounted]    = useState(false)

  // Wait for client mount before using createPortal (avoids SSR mismatch)
  useEffect(() => { setMounted(true) }, [])

  const close = useCallback(() => setSelected(null), [])

  // Escape key + body-scroll lock
  useEffect(() => {
    if (!selected) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [selected, close])

  if (images.length === 0) return null

  return (
    <>
      {/* ── Thumbnail row ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => setSelected(img)}
            className="group relative shrink-0 rounded-lg overflow-hidden border border-gray-100
                       cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label={`Enlarge ${img.label} photo`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.label}
              className="h-28 w-36 object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* Magnify hint — visible on hover/focus */}
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center
                         opacity-0 group-hover:opacity-100 group-focus:opacity-100
                         transition-opacity bg-black/25"
            >
              <span className="text-white text-2xl drop-shadow select-none">⤢</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── Lightbox — portal into <body> so it escapes all stacking contexts ── */}
      {mounted && selected && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.label} enlarged view`}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                     bg-black/85 px-4 py-10"
          onClick={close}
        >
          {/* Content area — stop propagation so clicking image doesn't close */}
          <div
            className="relative max-w-3xl w-full flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* × close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute -top-8 right-0 text-white/70 hover:text-white
                         text-4xl leading-none font-light transition-colors"
            >
              ×
            </button>

            {/* Full-size image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt={selected.label}
              className="max-h-[72vh] w-auto max-w-full rounded-xl shadow-2xl object-contain"
            />

            {/* Caption */}
            <div className="text-center space-y-1">
              <p className="text-white font-semibold text-sm tracking-wide">
                {selected.label}
              </p>
              {selected.attr && (
                <p className="text-white/55 text-xs leading-relaxed max-w-md">
                  {selected.attr}
                </p>
              )}
              <p className="text-white/35 text-[10px]">
                Tap outside · press Esc to close
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
