'use client'
// =============================================================================
// SubImageGallery — clickable sub-image thumbnails with full-screen lightbox.
//
// WHY a client component?
// The lightbox needs onClick state (selected image) which is browser-only.
// The parent page stays a Server Component — it passes the images as props.
// =============================================================================

import { useState, useEffect, useCallback } from 'react'

interface SubImage {
  url:   string
  attr?: string | null
  label: string   // "Flowers", "Fruits", etc.
}

interface Props {
  images: SubImage[]
}

export default function SubImageGallery({ images }: Props) {
  const [selected, setSelected] = useState<SubImage | null>(null)

  // Close on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelected(null)
  }, [])
  useEffect(() => {
    if (selected) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [selected, handleKey])

  if (images.length === 0) return null

  return (
    <>
      {/* Thumbnail grid */}
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => setSelected(img)}
            className="group relative shrink-0 rounded-lg overflow-hidden border border-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
            title={`Tap to enlarge — ${img.label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.label}
              className="h-28 w-36 object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* Magnify hint overlay */}
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <span className="text-white text-xl drop-shadow">⤢</span>
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-4 py-8"
          onClick={() => setSelected(null)}
        >
          {/* Stop click propagation on the image itself so clicking the image doesn't close */}
          <div
            className="relative max-w-3xl w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-3xl leading-none font-light"
              aria-label="Close"
            >
              ×
            </button>

            {/* Full image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt={selected.label}
              className="max-h-[70vh] w-auto max-w-full rounded-xl shadow-2xl object-contain"
            />

            {/* Label + attribution */}
            <div className="text-center space-y-0.5">
              <p className="text-white font-semibold text-sm">{selected.label}</p>
              {selected.attr && (
                <p className="text-white/60 text-xs">{selected.attr}</p>
              )}
              <p className="text-white/40 text-[10px]">Tap outside or press Esc to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
