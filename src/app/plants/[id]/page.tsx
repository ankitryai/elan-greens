import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSpeciesById, getInstancesBySpecies } from '@/lib/queries'
import { formatPlantAge, formatDate, splitPipe } from '@/lib/formatters'

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

      {/* Main photo */}
      {species.img_main_url && (
        <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={species.img_main_url} alt={species.common_name} className="w-full h-full object-cover" />
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

      {/* Interesting fact */}
      {species.interesting_fact && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Did you know?</span> {species.interesting_fact}
          </p>
        </div>
      )}

      {/* Sub-images */}
      {IMAGE_SECTIONS.some(s => {
        if (naParts.includes(s.key === 'flower' ? 'flowers' : s.key === 'fruit' ? 'fruits' : s.key === 'leaf' ? 'leaves' : s.key === 'bark' ? 'bark' : 'roots')) return false
        const k = s.key as string
        return (species as unknown as Record<string, unknown>)[`img_${k}_1_url`]
      }) && (
        <Section title="Photo Gallery">
          {IMAGE_SECTIONS.map(({ label, key }) => {
            const naKey = key === 'flower' ? 'flowers' : key === 'fruit' ? 'fruits' : key === 'leaf' ? 'leaves' : key === 'bark' ? 'bark' : 'roots'
            if (naParts.includes(naKey)) return null
            const sp = species as unknown as Record<string, string | null>
            const url1 = sp[`img_${key}_1_url`]
            const url2 = sp[`img_${key}_2_url`]
            const attr1 = sp[`img_${key}_1_attr`]
            if (!url1 && !url2) return null
            return (
              <div key={key} className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
                <div className="flex gap-2">
                  {url1 && (
                    <div className="space-y-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url1} alt={`${label} 1`} className="h-28 w-36 object-cover rounded-lg border border-gray-100" />
                      {attr1 && <p className="text-[10px] text-gray-400 max-w-[144px] truncate">{attr1}</p>}
                    </div>
                  )}
                  {url2 && (
                    <div className="space-y-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url2} alt={`${label} 2`} className="h-28 w-36 object-cover rounded-lg border border-gray-100" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </Section>
      )}

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
