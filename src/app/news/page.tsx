// News page — Server Component.
// Suspense lets the page shell render instantly; the feed streams in.
// revalidate = 3600 means the feed is re-fetched at most once per hour.

import { Suspense } from 'react'
import Link from 'next/link'
import { fetchPlantNews } from '@/lib/newsService'
import type { NewsArticle } from '@/lib/newsService'

export const revalidate = 3600

// ── Page shell ────────────────────────────────────────────────────────────────
export default function NewsPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-[20px] px-5 py-5"
        style={{ background: 'var(--md-surface-container-low)' }}
      >
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--md-font-display)',
            color: 'var(--md-primary)',
          }}
        >
          Plant News
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>
          Curated positive stories about plants in your garden — updated hourly.
        </p>
      </div>

      {/* Feed — streams in; shows skeleton while fetching */}
      <Suspense fallback={<NewsLoadingSkeleton />}>
        <NewsFeed />
      </Suspense>
    </div>
  )
}

// ── Async feed component (streams in via Suspense) ────────────────────────────
async function NewsFeed() {
  const articles = await fetchPlantNews()

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--md-surface-container)', color: 'var(--md-outline-variant)' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          No recent positive news — check back tomorrow.
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: 'var(--md-outline)' }}>
          News is sourced from platforms like The Better India, Mongabay, and Down to Earth.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {articles.map((article, idx) => (
        <ArticleCard key={`${article.url}-${idx}`} article={article} />
      ))}
      <p className="text-xs text-center pt-3 pb-1" style={{ color: 'var(--md-outline)' }}>
        Sourced from curated positive platforms · refreshed hourly
      </p>
    </div>
  )
}

// ── Article card ──────────────────────────────────────────────────────────────
function ArticleCard({ article }: { article: NewsArticle }) {
  const relativeTime = formatRelativeTime(article.pubDateMs)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-[16px] p-4 transition-all duration-200 group"
      style={{
        background: 'var(--md-surface-container-lowest)',
        boxShadow: 'var(--md-elevation-1)',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--md-elevation-2)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--md-elevation-1)'
      }}
    >
      {/* Top row: source + time + geo tag */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Source initial badge */}
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            background: 'var(--md-secondary-container)',
            color: 'var(--md-on-secondary-container)',
          }}
          aria-hidden
        >
          {article.sourceLabel.charAt(0).toUpperCase()}
        </span>

        <span className="text-xs font-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          {article.sourceLabel}
        </span>

        <span className="text-xs" style={{ color: 'var(--md-outline-variant)' }}>·</span>

        <span className="text-xs" style={{ color: 'var(--md-outline)' }}>
          {relativeTime}
        </span>

        {article.geoTag && (
          <>
            <span className="text-xs" style={{ color: 'var(--md-outline-variant)' }}>·</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--md-tertiary-container)',
                color: 'var(--md-on-tertiary-container)',
              }}
            >
              📍 {article.geoTag}
            </span>
          </>
        )}
      </div>

      {/* Headline */}
      <p
        className="text-sm font-semibold leading-snug group-hover:underline underline-offset-2 mb-3"
        style={{ color: 'var(--md-on-surface)' }}
      >
        {article.title}
      </p>

      {/* Plant tags */}
      {article.plants.length > 0 && (
        <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
          {article.plants.map(plant => (
            <Link
              key={plant.id}
              href={`/plants/${plant.id}`}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors duration-150"
              style={{
                background: 'var(--md-primary-container)',
                color: 'var(--md-on-primary-container)',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--md-secondary-container)'
                ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--md-on-secondary-container)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--md-primary-container)'
                ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--md-on-primary-container)'
              }}
            >
              {plant.common_name}
            </Link>
          ))}
        </div>
      )}
    </a>
  )
}

// ── Loading skeleton (shown while Suspense resolves) ──────────────────────────
function NewsLoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading news…" role="status">
      {/* Spinner + message */}
      <div className="flex items-center gap-3 px-4 py-4">
        <svg
          className="w-5 h-5 animate-spin shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: 'var(--md-primary)' }}
          aria-hidden
        >
          <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Fetching news relevant to your plants…
        </p>
      </div>

      {/* Skeleton cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[16px] p-4 space-y-2 animate-pulse"
          style={{
            background: 'var(--md-surface-container-lowest)',
            boxShadow: 'var(--md-elevation-1)',
          }}
        >
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
            <div className="h-3 w-28 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
            <div className="h-3 w-16 rounded-full ml-auto" style={{ background: 'var(--md-surface-container-high)' }} />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-full rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
            <div className="h-3.5 w-4/5 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-20 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
            <div className="h-6 w-16 rounded-full" style={{ background: 'var(--md-surface-container-high)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Relative time helper (pure server-side — no browser APIs needed) ──────────
function formatRelativeTime(ms: number): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days === 1)  return 'Yesterday'
  if (days < 30)   return `${days}d ago`
  if (days < 365)  return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
