'use client'

import { useState, useEffect, useRef } from 'react'

const TOPICS = [
  { value: 'species_correction', label: '🌿 Correct plant info',  hint: 'Name, category, description, photo, or other details about a listed plant' },
  { value: 'missing_species',    label: '➕ Missing plant',        hint: 'You spotted a plant here that isn\'t listed yet' },
  { value: 'location_fix',       label: '📍 Location issue',       hint: 'A plant\'s location feels off, the plant moved, or no longer exists there' },
  { value: 'landmark_issue',     label: '🏛️ Landmark note',        hint: 'Wrong landmark name, location, or a landmark that should be added' },
  { value: 'general',            label: '💡 General feedback',     hint: 'Suggestions, app issues, or anything else' },
] as const

type TopicValue = typeof TOPICS[number]['value']

const SUBTOPICS: Record<TopicValue, string[]> = {
  species_correction: ['Name or translation wrong', 'Wrong category', 'Description needs update', 'Photo looks incorrect', 'Ecological / medicinal info wrong', 'Other correction'],
  missing_species:    ['Plant spotted — not in directory'],
  location_fix:       ['Location on map is wrong', 'Plant has been moved', 'Plant no longer exists here'],
  landmark_issue:     ['Wrong landmark name', 'Wrong landmark location', 'Missing landmark — suggest adding'],
  general:            ['Feature suggestion', 'App bug or glitch', 'Other'],
}

const REFERENCE_LABEL: Record<TopicValue, string> = {
  species_correction: 'Which plant?',
  missing_species:    'Plant name (if known)',
  location_fix:       'Which plant?',
  landmark_issue:     'Which landmark?',
  general:            'Anything specific? (optional)',
}

export default function FeedbackWidget() {
  const [open, setOpen]               = useState(false)
  const [topic, setTopic]             = useState<TopicValue | ''>('')
  const [subtopic, setSubtopic]       = useState('')
  const [reference, setReference]     = useState('')
  const [details, setDetails]         = useState('')
  const [email, setEmail]             = useState('')
  const [hp, setHp]                   = useState('')            // honeypot
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const detailsRef = useRef<HTMLTextAreaElement>(null)

  // Listen for programmatic open (e.g. from plant detail "Suggest correction" link)
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { topic?: string; referenceName?: string } | undefined
      setOpen(true)
      setSuccess(false)
      setError(null)
      if (detail?.topic && TOPICS.some(t => t.value === detail.topic)) {
        setTopic(detail.topic as TopicValue)
        const subs = SUBTOPICS[detail.topic as TopicValue]
        if (subs?.length === 1) setSubtopic(subs[0])
        else setSubtopic('')
      }
      if (detail?.referenceName) setReference(detail.referenceName)
    }
    window.addEventListener('open-feedback', handler)
    return () => window.removeEventListener('open-feedback', handler)
  }, [])

  // Reset subtopic when topic changes
  useEffect(() => {
    if (!topic) return
    const subs = SUBTOPICS[topic]
    setSubtopic(subs.length === 1 ? subs[0] : '')
  }, [topic])

  function reset() {
    setTopic(''); setSubtopic(''); setReference(''); setDetails('')
    setEmail(''); setHp(''); setSuccess(false); setError(null)
  }

  function handleClose() { setOpen(false); setTimeout(reset, 300) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || !subtopic || details.length < 10) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subtopic, reference_name: reference || undefined, details, contact_email: email || undefined, _hp: hp }),
      })
      const json = await res.json() as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentTopic = TOPICS.find(t => t.value === topic)
  const subs = topic ? SUBTOPICS[topic] : []
  const canSubmit = !!topic && !!subtopic && details.length >= 10 && !submitting

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(true); setSuccess(false); setError(null) }}
        aria-label="Send feedback"
        className="fixed z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-md text-xs font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
          right: '16px',
          background: 'var(--md-secondary-container)',
          color: 'var(--md-on-secondary-container)',
        }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden>
          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V6h2v3z" clipRule="evenodd"/>
        </svg>
        Feedback
      </button>

      {/* ── Modal backdrop + panel ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--md-surface)',
              maxHeight: '92dvh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0 border-b"
              style={{ borderColor: 'var(--md-outline-variant)' }}
            >
              <p className="font-semibold text-base" style={{ color: 'var(--md-on-surface)' }}>
                Share feedback
              </p>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ color: 'var(--md-on-surface-variant)' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {success ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-3xl">🌿</p>
                  <p className="font-semibold text-base" style={{ color: 'var(--md-on-surface)' }}>
                    Thank you!
                  </p>
                  <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
                    Your feedback has been recorded. We review every submission.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-5 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot — hidden from real users */}
                  <input
                    type="text" tabIndex={-1} aria-hidden="true"
                    value={hp} onChange={e => setHp(e.target.value)}
                    style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
                    autoComplete="off"
                  />

                  {/* Topic */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--md-on-surface-variant)' }}>
                      What's this about?
                    </p>
                    <div className="space-y-1.5">
                      {TOPICS.map(t => (
                        <button
                          key={t.value} type="button"
                          onClick={() => setTopic(t.value)}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-150"
                          style={{
                            borderColor: topic === t.value ? 'var(--md-primary)' : 'var(--md-outline-variant)',
                            background:  topic === t.value ? 'var(--md-primary-container)' : 'var(--md-surface-container-low)',
                            color: 'var(--md-on-surface)',
                          }}
                        >
                          <p className="text-sm font-medium">{t.label}</p>
                          {topic === t.value && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>{t.hint}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtopic — only when topic chosen and has >1 option */}
                  {topic && subs.length > 1 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--md-on-surface-variant)' }}>
                        Specifically
                      </p>
                      <select
                        value={subtopic} onChange={e => setSubtopic(e.target.value)}
                        required
                        className="w-full rounded-xl px-3 py-2.5 text-sm border"
                        style={{
                          borderColor: 'var(--md-outline-variant)',
                          background: 'var(--md-surface-container-low)',
                          color: 'var(--md-on-surface)',
                        }}
                      >
                        <option value="">Select…</option>
                        {subs.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Reference */}
                  {topic && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {REFERENCE_LABEL[topic]}
                      </p>
                      <input
                        type="text" value={reference} onChange={e => setReference(e.target.value)}
                        maxLength={200} placeholder="e.g. Jungle Geranium"
                        className="w-full rounded-xl px-3 py-2.5 text-sm border"
                        style={{
                          borderColor: 'var(--md-outline-variant)',
                          background: 'var(--md-surface-container-low)',
                          color: 'var(--md-on-surface)',
                        }}
                      />
                    </div>
                  )}

                  {/* Details */}
                  {topic && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--md-on-surface-variant)' }}>
                        Details <span style={{ color: 'var(--md-error)' }}>*</span>
                      </p>
                      <textarea
                        ref={detailsRef}
                        value={details} onChange={e => setDetails(e.target.value)}
                        maxLength={1000} rows={3} required
                        placeholder="Tell us what you observed, what's wrong, or what you'd suggest…"
                        className="w-full rounded-xl px-3 py-2.5 text-sm border resize-none"
                        style={{
                          borderColor: 'var(--md-outline-variant)',
                          background: 'var(--md-surface-container-low)',
                          color: 'var(--md-on-surface)',
                        }}
                      />
                      <p className="text-[11px] text-right" style={{ color: details.length >= 1000 ? 'var(--md-error)' : 'var(--md-outline)' }}>
                        {details.length} / 1000
                      </p>
                    </div>
                  )}

                  {/* Contact email */}
                  {topic && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--md-on-surface-variant)' }}>
                        Your email <span className="font-normal normal-case" style={{ color: 'var(--md-outline)' }}>(optional — if you'd like a reply)</span>
                      </p>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        maxLength={200} placeholder="you@example.com"
                        className="w-full rounded-xl px-3 py-2.5 text-sm border"
                        style={{
                          borderColor: 'var(--md-outline-variant)',
                          background: 'var(--md-surface-container-low)',
                          color: 'var(--md-on-surface)',
                        }}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--md-error-container)', color: 'var(--md-on-error-container)' }}>
                      {error}
                    </p>
                  )}

                  {topic && (
                    <button
                      type="submit" disabled={!canSubmit}
                      className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                    >
                      {submitting ? 'Sending…' : 'Send feedback'}
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* Footer note */}
            {!success && (
              <p className="px-5 py-3 text-[11px] border-t shrink-0" style={{ color: 'var(--md-outline)', borderColor: 'var(--md-outline-variant)' }}>
                Feedback is reviewed by the Elan Greens admin. One submission per 10 minutes.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
