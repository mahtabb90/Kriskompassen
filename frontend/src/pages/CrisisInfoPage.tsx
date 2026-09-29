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

        <p className="mt-4 text-slate-600">Ingen krisinformation tillgänglig just nu.</p>
      </section>
    )
  }

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Krisinformation
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {mockCrisisData.map((item) => (
          <CrisisCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default CrisisInfoPage
