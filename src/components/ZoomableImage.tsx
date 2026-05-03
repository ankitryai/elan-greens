'use client'
// =============================================================================
// ZoomableImage — wraps a single <img> with a click-to-fullscreen lightbox.
//
// WHY React Portal + z-[9999]?
// Same reason as SubImageGallery: both nav bars use z-50, so any overlay
// rendered inside the normal document flow gets buried under them.
// createPortal() attaches the lightbox directly to <body>, and z-[9999]
// guarantees it is always the topmost layer.
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface ZoomableImageProps {
  src:        string
  alt:        string
  /** Classes applied to the thumbnail <img> (NOT the fullscreen copy) */
  className?: string
  /** Optional caption shown below the fullscreen image */
  caption?:   string
}

export default function ZoomableImage({ src, alt, className, caption }: ZoomableImageProps) {
  const [open,    setOpen]    = useState(false)
  const [mounted, setMounted] = useState(false)

  // Wait for client hydration before using createPortal (avoids SSR mismatch)
  useEffect(() => { setMounted(true) }, [])

  const close = useCallback(() => setOpen(false), [])

  // Body-scroll lock + Escape key
  useEffect(() => {
    if (!open) {
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
  }, [open, close])

  return (
    <>
      {/* Thumbnail — full-width clickable wrapper */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-green-500 rounded-2xl overflow-hidden"
        aria-label={`Enlarge ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
        {/* Hover hint overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
        >
          <span className="text-white text-3xl drop-shadow select-none
                           bg-black/30 rounded-full px-3 py-1 leading-none">⤢</span>
        </span>
      </button>

      {/* Fullscreen lightbox — portal into <body> */}
      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} enlarged view`}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                     bg-black/85 px-4 py-10"
          onClick={close}
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center gap-4"
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
              src={src}
              alt={alt}
              className="max-h-[80vh] w-auto max-w-full rounded-xl shadow-2xl object-contain"
            />

            {/* Caption */}
            <div className="text-center space-y-1">
              {caption && (
                <p className="text-white/70 text-sm leading-relaxed max-w-lg">{caption}</p>
              )}
              <p className="text-white/35 text-[10px]">Tap outside · press Esc to close</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
