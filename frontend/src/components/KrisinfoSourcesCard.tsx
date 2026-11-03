import { formatVerifiedDate, type VerifiedSource } from "../utils/krisinfoSources"
import ExternalLink from "./ExternalLink"

const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"

interface KrisinfoSourcesCardProps {
  sources: readonly VerifiedSource[]
  headingId: string
  intro: string
  isOnline: boolean
}

/**
 * Lists the sources a krisinfo page is based on, each with the date it was last checked.
 *
 * Presentational only: the page collects the sources with `collectSources` and passes them in
 * display order, together with `isOnline` from `useMode()`. The region is named by its "Källor"
 * heading. Every source is an `ExternalLink`, so it looks like the page's other external links,
 * announces the new tab and says that it needs internet while the browser reports no connection.
 *
 * @param props.sources The distinct sources with their check dates.
 * @param props.headingId A page-unique id for the heading that names the region.
 * @param props.intro The sentence introducing the list, in Swedish.
 * @param props.isOnline Browser-reported connectivity, passed to the source links.
 */
function KrisinfoSourcesCard({ sources, headingId, intro, isOnline }: KrisinfoSourcesCardProps) {
  return (
    <section aria-labelledby={headingId} className={`mt-8 ${CARD_CLASSES}`}>
      <h2 id={headingId} className="text-lg font-semibold text-blue-900">
        Källor
      </h2>
      <p className="mt-3 text-slate-700">{intro}</p>
      <ul className="mt-4 space-y-3">
        {sources.map(({ source, lastVerified }) => (
          <li key={source.url}>
            <ExternalLink href={source.url} label={source.name} isOnline={isOnline} />
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
