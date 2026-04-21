import { getAllStaff } from '@/lib/queries'
import { formatTenure } from '@/lib/formatters'

export const revalidate = 3600

const ROLE_COLORS: Record<string, string> = {
  'Head Gardener':       'bg-green-100 text-green-800',
  'Assistant Gardener':  'bg-teal-100 text-teal-800',
  'Maintenance Staff':   'bg-gray-100 text-gray-700',
}

export default async function GreenTeamPage() {
  const staff = await getAllStaff()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">The Green Team</h1>
        <p className="text-sm text-gray-500 mt-1">
          The dedicated people who keep Elan Greens beautiful.
        </p>
      </div>

      {staff.length === 0 && (
        <p className="text-center py-16 text-gray-400">Coming soon.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {staff.map(member => (
          <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4">
            {/* Photo */}
            <div className="shrink-0">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-green-100"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center text-2xl border-2 border-green-100">
                  👷
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-gray-900 leading-tight">{member.name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'}`}>
                {member.role}
              </span>
              {member.date_of_joining && (
                <p className="text-xs text-gray-400">{formatTenure(member.date_of_joining)}</p>
              )}
              {member.speciality && (
                <p className="text-xs text-gray-500">Speciality: {member.speciality}</p>
              )}
              {member.tribute_note && (
                <p className="text-xs text-gray-600 italic leading-relaxed pt-1">"{member.tribute_note}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
