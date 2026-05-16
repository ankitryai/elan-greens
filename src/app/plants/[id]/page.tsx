import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSpeciesById, getInstancesBySpecies, getRelatedSpecies } from '@/lib/queries'
import { formatPlantAge, formatDate, splitPipe } from '@/lib/formatters'
import SubImageGallery from '@/components/SubImageGallery'
import ZoomableImage from '@/components/ZoomableImage'

export const revalidate = 3600

// Sub-image sections shown on the detail page.
const IMAGE_SECTIONS = [
  { label: 'Flowers', key: 'flower' },
  { label: 'Fruits',  key: 'fruit'  },
  { label: 'Leaves',  key: 'leaf'   },
  { label: 'Bark',    key: 'bark'   },
  { label: 'Roots',   key: 'root'   },
] as const

/* Maps iNaturalist observation count to plain-English rarity label */
function observationRarity(count: number): string {
  if (count <= 10)      return 'Very rarely documented globally'
  if (count <= 100)     return 'Rarely documented globally'
  if (count <= 1_000)   return 'Occasionally documented globally'
  if (count <= 10_000)  return 'Commonly documented globally'
  if (count <= 100_000) return 'Frequently documented globally'
  return 'Widely documented globally'
}

/* IUCN status → semantic colour */
function conservationColor(status: string): string {
  if (status === 'Least Concern')   return 'var(--md-primary)'
  if (status === 'Near Threatened') return '#B45309'
  if (status === 'Vulnerable')      return '#C05621'
  if (status === 'Endangered' || status === 'Critically Endangered') return 'var(--md-error)'
  return 'var(--md-on-surface)'
}

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [species, instances, relatedSpecies] = await Promise.all([
    getSpeciesById(id),
    getInstancesBySpecies(id),
    getRelatedSpecies(id),
  ])
  if (!species) notFound()

  const naParts      = splitPipe(species.not_applicable_parts)
  const medicinalProps = splitPipe(species.medicinal_properties)

  return (
    <div className="space-y-6 pb-4">

      {/* ── Back link — M3 Text Button ── */}
      <Link
        href="/"
        className="m3-state inline-flex items-center gap-1.5 px-1 py-1 -ml-1 rounded-full text-sm font-medium transition-colors duration-150"
        style={{ color: 'var(--md-primary)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        All Plants
      </Link>

      {/* ── Hero image ── */}
      {species.img_main_url && (
        <div
          className="overflow-hidden rounded-[28px]"
          style={{ aspectRatio: '16/9', maxHeight: '440px' }}
        >
          <ZoomableImage
            src={species.img_main_url}
            alt={species.common_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Identity block ── */}
      <div className="space-y-2">
        {/* Headline + chips row */}
        <div className="flex items-start gap-2 flex-wrap">
          <h1
            className="text-2xl font-bold leading-tight"
            style={{
              color: 'var(--md-on-surface)',
              fontFamily: 'var(--md-font-body)',
            }}
          >
            {species.common_name}
          </h1>
          <CategoryChip category={species.category} />
          {species.tentative && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold mt-0.5"
              style={{ background: '#FFF3CD', color: '#7D5A00' }}
            >
              TENTATIVE
            </span>
          )}
        </div>

        {species.botanical_name && (
          <p
            className="text-base italic"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            {species.botanical_name}
          </p>
        )}

        {/* Taxonomy line */}
        {(species.genus || species.plant_family) && (
          <div
            className="flex gap-4 flex-wrap text-xs pt-0.5"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            {species.genus && (
              <span>Genus · <span className="italic">{species.genus}</span></span>
            )}
            {species.plant_family && (
              <span>Family · <span className="italic">{species.plant_family}</span></span>
            )}
          </div>
        )}

        {/* Regional names */}
        {(species.hindi_name || species.kannada_name || species.tamil_name) && (
          <div className="flex gap-2 flex-wrap pt-1">
            {species.hindi_name    && <LangChip label="हिंदी" value={species.hindi_name} />}
            {species.kannada_name  && <LangChip label="ಕನ್ನಡ"  value={species.kannada_name} />}
            {species.tamil_name    && <LangChip label="தமிழ்"  value={species.tamil_name} />}
          </div>
        )}
      </div>

      {/* ── Quick facts grid ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {species.height_category       && <Fact label="Height"     value={species.height_category} />}
        {species.flowering_type        && <Fact label="Type"       value={species.flowering_type} />}
        {species.flowering_season      && <Fact label="Flowering"  value={species.flowering_season} />}
        {species.life_span_description && <Fact label="Lifespan"   value={species.life_span_description} />}
        {species.native_region         && <Fact label="Native to"  value={species.native_region} />}
        {species.plant_family          && <Fact label="Family"     value={species.plant_family} />}
        {species.sunlight_needs        && <Fact label="Sunlight"   value={species.sunlight_needs} />}
        {species.watering_needs        && <Fact label="Water"      value={species.watering_needs} />}
        {species.toxicity              && <Fact label="Toxicity"   value={species.toxicity} />}
        {species.edible_parts          && <Fact label="Edible"     value={species.edible_parts} />}
        {species.foliage_type          && <Fact label="Foliage"    value={species.foliage_type} />}
        {species.growth_rate           && <Fact label="Growth"     value={species.growth_rate} />}

        {species.observations_count != null && (
          <div
            className="rounded-xl px-3 py-2.5 space-y-0.5"
            style={{ background: 'var(--md-surface-container-low)' }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-on-surface-variant)' }}
            >
              Global Sightings
            </p>
            <p
              className="text-sm font-semibold tabular-nums"
              style={{ color: 'var(--md-on-surface)' }}
            >
              {species.observations_count.toLocaleString()}
            </p>
            <p
              className="text-[10px] italic"
              style={{ color: 'var(--md-on-surface-variant)' }}
            >
              {observationRarity(species.observations_count)}
            </p>
          </div>
        )}

        {species.conservation_status && (
          <div
            className="rounded-xl px-3 py-2.5 space-y-0.5"
            style={{ background: 'var(--md-surface-container-low)' }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-on-surface-variant)' }}
            >
              Conservation
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: conservationColor(species.conservation_status) }}
            >
              {species.conservation_status}
            </p>
          </div>
        )}
      </div>

      {/* ── About ── */}
      {species.description && (
        <Section title="About">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--md-on-surface-variant)' }}
          >
            {species.description}
          </p>
        </Section>
      )}

      {/* ── Medicinal / ecological properties ── */}
      {medicinalProps.length > 0 && (
        <Section title="Medicinal &amp; Ecological Properties">
          <ul className="space-y-2">
            {medicinalProps.map((prop, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm"
                style={{ color: 'var(--md-on-surface-variant)' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--md-primary)' }} aria-hidden>
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                {prop}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Propagation ── */}
      {species.propagation_methods && (
        <Section title="Propagation">
          <div className="flex flex-wrap gap-2">
            {splitPipe(species.propagation_methods).map((method, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{
                  background: 'var(--md-secondary-container)',
                  color: 'var(--md-on-secondary-container)',
                }}
              >
                {method}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Habitat ── */}
      {species.habitat_type && (
        <div
          className="flex items-start gap-2.5 text-sm rounded-xl px-4 py-3"
          style={{
            background: 'var(--md-surface-container-low)',
            color: 'var(--md-on-surface-variant)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0 mt-0.5"
            style={{ color: 'var(--md-tertiary)' }} aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
          </svg>
          <span>
            <span
              className="font-medium"
              style={{ color: 'var(--md-on-surface)' }}
            >
              Found in ·{' '}
            </span>
            {species.habitat_type}
          </span>
        </div>
      )}

      {/* ── Did you know — M3 primary container ── */}
      {species.interesting_fact && (
        <div
          className="rounded-[16px] px-4 py-4"
          style={{
            background: 'var(--md-primary-container)',
            color: 'var(--md-on-primary-container)',
          }}
        >
          <p className="text-sm leading-relaxed">
            <span className="font-bold">Did you know?</span>{' '}
            {species.interesting_fact}
          </p>
        </div>
      )}

      {/* ── Photo gallery ── */}
      {(() => {
        const allImgs = IMAGE_SECTIONS.flatMap(({ label, key }) => {
          const naKey =
            key === 'flower' ? 'flowers' :
            key === 'fruit'  ? 'fruits'  :
            key === 'leaf'   ? 'leaves'  :
            key === 'bark'   ? 'bark'    : 'roots'
          if (naParts.includes(naKey)) return []
          const sp   = species as unknown as Record<string, string | null>
          const url1 = sp[`img_${key}_1_url`]
          const url2 = sp[`img_${key}_2_url`]
          const attr1 = sp[`img_${key}_1_attr`]
          const attr2 = sp[`img_${key}_2_attr`]
          const imgs = []
          if (url1) imgs.push({ url: url1, attr: attr1, label })
          if (url2) imgs.push({ url: url2, attr: attr2, label })
          return imgs
        })
        if (allImgs.length === 0) return null

        const hasGenusMatch = allImgs.some(
          img => img.attr?.includes('· genus match') || img.attr?.includes('via iNaturalist')
        )

        return (
          <Section title="Photo Gallery">
            {IMAGE_SECTIONS.map(({ label, key }) => {
              const naKey =
                key === 'flower' ? 'flowers' :
                key === 'fruit'  ? 'fruits'  :
                key === 'leaf'   ? 'leaves'  :
                key === 'bark'   ? 'bark'    : 'roots'
              if (naParts.includes(naKey)) return null
              const sp   = species as unknown as Record<string, string | null>
              const url1 = sp[`img_${key}_1_url`]
              const url2 = sp[`img_${key}_2_url`]
              if (!url1 && !url2) return null
              const sectionImgs = [
                url1 ? { url: url1, attr: sp[`img_${key}_1_attr`], label } : null,
                url2 ? { url: url2, attr: sp[`img_${key}_2_attr`], label } : null,
              ].filter(Boolean) as { url: string; attr: string | null; label: string }[]
              return (
                <div key={key} className="mb-4">
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--md-on-surface-variant)' }}
                  >
                    {label}
                  </p>
                  <SubImageGallery images={sectionImgs} />
                </div>
              )
            })}

            {/* Genus-match disclaimer */}
            {hasGenusMatch && (() => {
              const genusName =
                species.genus ||
                species.botanical_name?.trim().split(/\s+/)[0] ||
                'the same genus'
              return (
                <p
                  className="text-[10px] rounded-xl px-3 py-2.5 mt-2 leading-relaxed"
                  style={{
                    background: '#FFF8E1',
                    color: '#7D5A00',
                    border: '1px solid #FFE082',
                  }}
                >
                  * Some images may depict a closely related species within genus{' '}
                  <em>{genusName}</em>
                  {species.botanical_name ? `, not this exact plant (${species.botanical_name})` : ''}.
                  Species-level photos were unavailable in public databases at curation time.
                </p>
              )
            })()}
          </Section>
        )
      })()}

      {/* ── Related species ── */}
      {relatedSpecies.length > 0 && (
        <Section title="Also in This Garden">
          <div className="space-y-2">
            {relatedSpecies.map(rel => (
              <Link
                key={rel.link_id}
                href={`/plants/${rel.species_id}`}
                className="m3-state flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                style={{ background: 'var(--md-surface-container-low)' }}
              >
                {rel.img_main_url ? (
                  <div className="h-12 w-16 flex-shrink-0 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rel.img_main_url}
                      alt={rel.common_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-12 w-16 flex-shrink-0 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'var(--md-surface-container)',
                      color: 'var(--md-outline-variant)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-8 2 1.83-1.37 3.66-2.58 5-3a6.43 6.43 0 00-5.11 1.11C12.26 4.67 11.2 7 11.2 7c-.54-.42-.93-.94-1.2-1.5C8.69 8.5 8.5 11 8.5 11c-1.29-1.5-1.5-3.5-1.5-3.5C5.5 10 5.5 13 6.5 15c.35.7.84 1.37 1.5 1.96"/>
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--md-on-surface)' }}
                  >
                    {rel.common_name}
                  </p>
                  {rel.botanical_name && (
                    <p
                      className="text-xs italic truncate"
                      style={{ color: 'var(--md-on-surface-variant)' }}
                    >
                      {rel.botanical_name}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full shrink-0 font-medium"
                  style={{
                    background: 'var(--md-secondary-container)',
                    color: 'var(--md-on-secondary-container)',
                  }}
                >
                  {rel.link_label}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── Locations ── */}
      {instances.length > 0 && (
        <Section title={`Found in ${instances.length} location${instances.length !== 1 ? 's' : ''}`}>
          <div className="space-y-2">
            {instances.map(inst => (
              <div
                key={inst.id}
                className="flex items-start justify-between rounded-xl px-3 py-3"
                style={{ background: 'var(--md-surface-container-low)' }}
              >
                <div className="space-y-0.5">
                  {inst.internal_identification_no && (
                    <p
                      className="text-xs font-mono"
                      style={{ color: 'var(--md-outline)' }}
                    >
                      #{inst.internal_identification_no}
                    </p>
                  )}
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--md-on-surface)' }}
                  >
                    {inst.custom_location_desc ?? 'Location recorded'}
                  </p>
                  {inst.date_of_plantation && (
                    <p
                      className="text-xs"
                      style={{ color: 'var(--md-on-surface-variant)' }}
                    >
                      Planted {formatDate(inst.date_of_plantation)}
                      {formatPlantAge(inst.date_of_plantation) &&
                        ` · ${formatPlantAge(inst.date_of_plantation)} old`}
                    </p>
                  )}
                </div>
                {inst.lat && inst.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${inst.lat},${inst.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium shrink-0 ml-3 underline underline-offset-2"
                    style={{ color: 'var(--md-primary)' }}
                  >
                    View map
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}

/* ── Sub-components ── */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 space-y-0.5"
      style={{ background: 'var(--md-surface-container-low)' }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--md-on-surface-variant)' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--md-on-surface)' }}
      >
        {value}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2
        className="text-base font-semibold"
        style={{ color: 'var(--md-on-surface)' }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  )
}

/* Category chip — M3 Suggestion Chip, tonal */
const CATEGORY_TONES: Record<string, { bg: string; text: string }> = {
  Tree:    { bg: '#C8E6C9', text: '#1B5E20' },
  Palm:    { bg: '#B2EBF2', text: '#006064' },
  Shrub:   { bg: '#DCEDC8', text: '#33691E' },
  Herb:    { bg: '#C8F5E0', text: '#004D35' },
  Creeper: { bg: '#CFE2FF', text: '#003399' },
  Climber: { bg: '#E1BEE7', text: '#4A148C' },
  Hedge:   { bg: '#F0F4C3', text: '#827717' },
  Grass:   { bg: '#FFF9C4', text: '#F57F17' },
}

function CategoryChip({ category }: { category: string }) {
  const tone = CATEGORY_TONES[category] ?? { bg: 'var(--md-secondary-container)', text: 'var(--md-on-secondary-container)' }
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-semibold mt-0.5 shrink-0"
      style={{ background: tone.bg, color: tone.text }}
    >
      {category}
    </span>
  )
}

/* Regional language chip */
function LangChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
      style={{
        background: 'var(--md-surface-container)',
        color: 'var(--md-on-surface-variant)',
      }}
    >
      <span
        className="font-semibold text-[10px]"
        style={{ color: 'var(--md-outline)' }}
      >
        {label}
      </span>
      {value}
    </span>
  )
}
