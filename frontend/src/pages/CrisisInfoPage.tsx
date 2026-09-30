import CrisisCard from "../components/CrisisCard"
import { mockCrisisData } from "../data/mockCrisisData"

/**
 * Renders the available crisis information from the local dataset.
 *
 * Displays an empty state when the dataset contains no crisis information.
 */
function CrisisInfoPage() {
  if (mockCrisisData.length === 0) {
    return (
      <section>
        <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
          Krisinformation
        </h1>

        <div className="mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8">
          <p>Ingen krisinformation tillgänglig just nu.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Krisinformation
      </h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {mockCrisisData.map((item) => (
          <CrisisCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default CrisisInfoPage
