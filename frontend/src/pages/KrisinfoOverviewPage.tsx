import KrisinfoSectionCard from "../components/KrisinfoSectionCard"
import { krisinfoOverviewSections } from "../components/krisinfoOverviewSections"

/**
 * Overview of all crisis information: one card per part, linking to that part's page, in the
 * order of `krisinfoOverviewSections`.
 *
 * The page is static and performs no I/O, so it works offline. The cards are a list, so screen
 * readers announce how many parts there are.
 */
function KrisinfoOverviewPage() {
  return (
    <section>
      <h1
        id="page-heading"
        tabIndex={-1}
        className="wrap-anywhere text-3xl font-bold text-blue-900"
      >
        Krisinformation
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
        Här har vi samlat det du behöver veta om kriser – både för att förbereda dig och för när
        något redan har hänt.
      </p>
      <ul aria-label="Delar av krisinformationen" className="mt-6 grid gap-6 md:grid-cols-2">
        {krisinfoOverviewSections.map((section) => (
          <li key={section.id}>
            <KrisinfoSectionCard section={section} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default KrisinfoOverviewPage
