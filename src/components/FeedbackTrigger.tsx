'use client'

import type React from 'react'

// Lightweight client button that opens the global FeedbackWidget modal,
// optionally pre-filling topic + reference name via a custom DOM event.
export default function FeedbackTrigger({
  topic,
  referenceName,
  label = 'Suggest a correction',
  className,
  style,
}: {
  topic?: string
  referenceName?: string
  label?: string
  className?: string
  style?: React.CSSProperties
}) {
  function open() {
    window.dispatchEvent(
      new CustomEvent('open-feedback', { detail: { topic, referenceName } }),
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      className={className}
      style={style ?? { color: 'var(--md-primary)' }}
    >
      {label}
    </button>
  )
}
