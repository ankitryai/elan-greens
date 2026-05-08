import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSpeciesById, getInstancesBySpecies } from '@/lib/queries'
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

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [species, instances] = await Promise.all([
    getSpeciesById(id),
    getInstancesBySpecies(id),
  ])
  if (!species) notFound()

  const naParts = splitPipe(species.not_applicable_parts)
  const medicinalProps = splitPipe(species.medicinal_properties)

  return (
    <div className="space-y-6 pb-4">

      {/* Back link */}
      <Link href="/" className="text-sm text-green-700 hover:underline">← All Plants</Link>

      {/* Main photo — click / tap to zoom (ZoomableImage portal-lightbox) */}
      {species.img_main_url && (
        <div className="aspect-[16/9] bg-gray-100">
          <ZoomableImage
            src={species.img_main_url}
            alt={species.common_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Identity */}
      <div className="space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{species.common_name}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium mt-1">
            {species.category}
          </span>
          {species.tentative && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium mt-1">
              TENTATIVE
            </span>
          )}
        </div>
        {species.botanical_name && (
          <p className="text-base italic text-gray-500">{species.botanical_name}</p>
        )}

        {/* Taxonomy line — genus + family inline when either is present */}
        {(species.genus || species.plant_family) && (
          <p className="text-xs text-gray-400 flex gap-3 flex-wrap pt-0.5">
            {species.genus       && <span>Genus · <span className="italic">{species.genus}</span></span>}
            {species.plant_family && <span>Family · <span className="italic">{species.plant_family}</span></span>}
          </p>
        )}

        {/* Regional names */}
        {(species.hindi_name || species.kannada_name || species.tamil_name) && (
          <div className="flex gap-3 flex-wrap pt-1 text-sm text-gray-500">
            {species.hindi_name    && <span>🇮🇳 {species.hindi_name}</span>}
            {species.kannada_name  && <span>ಕ {species.kannada_name}</span>}
            {species.tamil_name    && <span>த {species.tamil_name}</span>}
          </div>
        )}
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {species.height_category    && <Fact label="Height"    value={species.height_category} />}
        {species.flowering_type     && <Fact label="Type"      value={species.flowering_type} />}
        {species.flowering_season   && <Fact label="Flowering" value={species.flowering_season} />}
        {species.life_span_description && <Fact label="Lifespan" value={species.life_span_description} />}
        {species.native_region      && <Fact label="Native to" value={species.native_region} />}
        {species.plant_family       && <Fact label="Family"    value={species.plant_family} />}
        {species.sunlight_needs     && <Fact label="Sunlight"  value={species.sunlight_needs} />}
        {species.watering_needs     && <Fact label="Water"     value={species.watering_needs} />}
        {species.toxicity           && <Fact label="Toxicity"  value={species.toxicity} />}
        {species.edible_parts       && <Fact label="Edible"    value={species.edible_parts} />}
        {species.foliage_type       && <Fact label="Foliage"   value={species.foliage_type} />}
        {species.growth_rate        && <Fact label="Growth"    value={species.growth_rate} />}
        {species.observations_count != null && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Global Sightings</p>
            <p className="text-sm text-gray-800 mt-0.5">{species.observations_count.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 italic">{observationRarity(species.observations_count)}</p>
          </div>
        )}
        {species.conservation_status && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Conservation</p>
            <p className={`text-sm mt-0.5 font-medium ${
              species.conservation_status === 'Least Concern'    ? 'text-green-700' :
              species.conservation_status === 'Near Threatened'  ? 'text-yellow-700' :
              species.conservation_status === 'Vulnerable'       ? 'text-amber-700' :
              species.conservation_status === 'Endangered' || species.conservation_status === 'Critically Endangered'
                                                                 ? 'text-red-700' :
                                                                   'text-gray-800'
            }`}>
              {species.conservation_status}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      {species.description && (
        <Section title="About">
          <p className="text-gray-700 text-sm leading-relaxed">{species.description}</p>
        </Section>
      )}

      {/* Medicinal / ecological properties */}
      {medicinalProps.length > 0 && (
        <Section title="Medicinal &amp; Ecological Properties">
          <ul className="space-y-1">
            {medicinalProps.map((prop, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 mt-0.5">✓</span>
                {prop}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Propagation methods */}
      {species.propagation_methods && (
        <Section title="Propagation">
          <div className="flex flex-wrap gap-2">
            {splitPipe(species.propagation_methods).map((method, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-800 border border-green-100 font-medium">
                {method}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Habitat */}
      {species.habitat_type && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <span className="text-gray-400 shrink-0 mt-0.5">🌍</span>
          <span><span className="font-medium text-gray-700">Found in · </span>{species.habitat_type}</span>
        </div>
      )}

      {/* Interesting fact */}
      {species.interesting_fact && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Did you know?</span> {species.interesting_fact}
          </p>
        </div>
      )}

      {/* Sub-images */}
      {(() => {
        // Build a flat list of all sub-images across all categories
        const allImgs = IMAGE_SECTIONS.flatMap(({ label, key }) => {
          const naKey = key === 'flower' ? 'flowers' : key === 'fruit' ? 'fruits' : key === 'leaf' ? 'leaves' : key === 'bark' ? 'bark' : 'roots'
          if (naParts.includes(naKey)) return []
          const sp = species as unknown as Record<string, string | null>
          const url1  = sp[`img_${key}_1_url`]
          const url2  = sp[`img_${key}_2_url`]
          const attr1 = sp[`img_${key}_1_attr`]
          const attr2 = sp[`img_${key}_2_attr`]
          const imgs = []
          if (url1) imgs.push({ url: url1, attr: attr1, label })
          if (url2) imgs.push({ url: url2, attr: attr2, label })
          return imgs
        })
        if (allImgs.length === 0) return null
        // Show the genus disclaimer when:
        //   a) any attribution has "· genus match" (new saves — precise marker), OR
        //   b) any attribution has "via iNaturalist" (old saves pre-dating the marker;
        //      iNaturalist results may be genus-level when species has no observations)
        const hasGenusMatch = allImgs.some(
          img => img.attr?.includes('· genus match') || img.attr?.includes('via iNaturalist')
        )
        return (
          <Section title="Photo Gallery">
            {IMAGE_SECTIONS.map(({ label, key }) => {
              const naKey = key === 'flower' ? 'flowers' : key === 'fruit' ? 'fruits' : key === 'leaf' ? 'leaves' : key === 'bark' ? 'bark' : 'roots'
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
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {label}
                  </p>
                  <SubImageGallery images={sectionImgs} />
                </div>
              )
            })}

            {/* Genus-match disclaimer — only when at least one image came from a
                genus-level search (exact species had no photos in the database).
                Uses the stored genus field for precision; falls back to parsing
                from botanical name if genus is not yet saved. */}
            {hasGenusMatch && (() => {
              const genusName = species.genus
                || species.botanical_name?.trim().split(/\s+/)[0]
                || 'the same genus'
              return (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100
                               rounded-lg px-3 py-2 mt-2 leading-relaxed">
                  * Some images in this gallery may depict a closely related species within
                  genus <em>{genusName}</em>, not this exact plant
                  {species.botanical_name ? ` (${species.botanical_name})` : ''}.
                  Photos at species level were unavailable in public databases at time of
                  curation — use the botanical name above for precise identification.
                </p>
              )
            })()}
          </Section>
        )
      })()}

      {/* Locations */}
      {instances.length > 0 && (
        <Section title={`Found in ${instances.length} location${instances.length !== 1 ? 's' : ''}`}>
          <div className="space-y-2">
            {instances.map(inst => (
              <div key={inst.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="space-y-0.5">
                  {inst.internal_identification_no && (
                    <p className="text-xs font-mono text-gray-400">#{inst.internal_identification_no}</p>
                  )}
                  <p className="text-sm text-gray-800">{inst.custom_location_desc ?? 'Location recorded'}</p>
                  {inst.date_of_plantation && (
                    <p className="text-xs text-gray-400">
                      Planted {formatDate(inst.date_of_plantation)}
                      {formatPlantAge(inst.date_of_plantation) && ` · ${formatPlantAge(inst.date_of_plantation)} old`}
                    </p>
                  )}
                </div>
                {inst.lat && inst.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${inst.lat},${inst.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 underline shrink-0 ml-2"
                  >
                    View on map
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

// Maps an iNaturalist observation count to a plain-English rarity label
// so residents understand what the number means without knowing the platform.
//
// Thresholds are calibrated to iNat's global scale:
//   <10      — plant barely recorded anywhere (obscure ornamentals, rare species)
//   10–100   — some specialist records, rarely photographed by public
//   101–1 k  — recognised species with a small but active observer community
//   1k–10k   — common enough that naturalists regularly document it
//   10k–100k — widespread; frequently photographed across regions
//   >100k    — iconic / ubiquitous species (e.g. Bougainvillea, Frangipani)
function observationRarity(count: number): string {
  if (count <= 10)      return 'Very rarely documented globally'
  if (count <= 100)     return 'Rarely documented globally'
  if (count <= 1_000)   return 'Occasionally documented globally'
  if (count <= 10_000)  return 'Commonly documented globally'
  if (count <= 100_000) return 'Frequently documented globally'
  return 'Widely documented globally'
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-1"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  )
}
