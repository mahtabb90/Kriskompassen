import { formatVerifiedDate, type VerifiedSource } from "../utils/krisinfoSources"

const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"

interface KrisinfoSourcesCardProps {
  sources: readonly VerifiedSource[]
  headingId: string
  intro: string
}

/**
 * Lists the sources a krisinfo page is based on, each with the date it was last checked.
 *
 * Presentational only: the page collects the sources with `collectSources` and passes them in
 * display order. The region is named by its "Källor" heading, and every source link opens in a
 * new tab and says so in its text.
 *
 * @param props.sources The distinct sources with their check dates.
 * @param props.headingId A page-unique id for the heading that names the region.
 * @param props.intro The sentence introducing the list, in Swedish.
 */
function KrisinfoSourcesCard({ sources, headingId, intro }: KrisinfoSourcesCardProps) {
  return (
    <section aria-labelledby={headingId} className={`mt-8 ${CARD_CLASSES}`}>
      <h2 id={headingId} className="text-lg font-semibold text-blue-900">
        Källor
      </h2>
      <p className="mt-3 text-slate-700">{intro}</p>
      <ul className="mt-4 space-y-3">
        {sources.map(({ source, lastVerified }) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4"
            >
              {source.name} (öppnas i ny flik)
            </a>
            <p className="text-sm text-slate-600">
              Senast kontrollerad: {formatVerifiedDate(lastVerified)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default KrisinfoSourcesCard
