export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">About Elan Greens</h1>
      </div>

      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          <strong>Divyasree Elan Homes</strong> is a residential community on Sarjapur Road, Bengaluru,
          surrounded by thoughtfully planted trees, shrubs, and flowering plants that make everyday
          life greener and more peaceful.
        </p>
        <p>
          <strong>Elan Greens</strong> is a living directory of every plant species found within the
          society — their names in multiple languages, ecological properties, locations, and the
          stories behind them.
        </p>
        <p>
          This app is also a tribute to the <strong>Green Team</strong> — the dedicated gardeners and
          maintenance staff who nurture this green ecosystem every day.
        </p>
      </div>

      <div className="bg-green-50 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-semibold text-green-800">How data is collected</p>
        <p className="text-green-700">
          Plants are identified using AI (Plant.id) and verified by the society admin.
          Species marked <span className="font-semibold">TENTATIVE</span> are AI-suggested and
          pending manual verification.
        </p>
      </div>

      <div className="text-xs text-gray-400 space-y-1 pt-2">
        <p>Plant images sourced from Wikimedia Commons under their respective open licences.</p>
        <p>Plant identification powered by Plant.id and Google Cloud Vision.</p>
        <p>Maps powered by OpenStreetMap contributors.</p>
        <p className="pt-2">Built with ♥ for the Elan community.</p>
      </div>
    </div>
  )
}
