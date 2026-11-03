import BackLink from "../components/BackLink"
import ExternalLink from "../components/ExternalLink"
import KrisinfoSourcesCard from "../components/KrisinfoSourcesCard"
import SignalCard from "../components/SignalCard"
import { useMode } from "../context/modeContext"
import { useKrisinfo } from "../hooks/useKrisinfo"
import { collectSources } from "../utils/krisinfoSources"

/**
 * The "Utomhusvarning" page: explains the four outdoor warning signals ("Hesa Fredrik", named in
 * a line under the heading): how each one sounds, what it means and what to do, followed by
 * every source with its check date. A link back to the krisinfo overview sits above the heading.
 *
 * Reads through `useKrisinfo`, so the content is available offline once the app is installed and
 * makes no network request. It is the only reader of the content and of `useMode()`; each
 * `SignalCard` receives its signal and `isOnline` as props, in the source's order.
 * Browser-reported connectivity, not the "Sparad information" mode, decides whether external
 * links say that they need internet. Between the lead paragraph and the cards, one line says that
 * the recordings the cards link to come from MCF and links to the section's source page. Sources
 * are listed in order of first use, including the
 * separate source of a meaning. The page heading stays mounted across loading states so the
 * layout can name and focus it.
 */
function WarningSignalsPage() {
  const { state, retry } = useKrisinfo("warning-signals")
  const { isOnline } = useMode()

  return (
    <section>
      <BackLink to="/krisinformation" label="Tillbaka till krisinformation" />
      <h1
        id="page-heading"
        tabIndex={-1}
        className="wrap-anywhere text-3xl font-bold text-blue-900"
      >
        Utomhusvarning
      </h1>
      {/* Keeps the familiar name visible beside the heading, which matches the overview card. */}
      <p className="mt-2 text-lg font-semibold text-blue-900 sm:mt-3 sm:text-xl">
        Hesa Fredrik – de fyra varningssignalerna
      </p>

      {state.status === "loading" && (
        <p role="status" className="mt-4">
          Läser in varningssignalerna…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-4">
          <p role="alert" className="text-red-800">
            Varningssignalerna kunde inte visas. Försök igen.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
          >
            Försök igen
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
            {state.data.summary}
          </p>
          {/* The sentence stays complete without its link, which follows it, so it also reads
              well offline and in a screen reader's list of links. */}
          <p className="mt-3 max-w-prose text-sm text-slate-600">
            Ljuden kommer från Myndigheten för civilt försvar (MCF).{" "}
            <ExternalLink
              href={state.data.source.url}
              label="MCF:s sida om Hesa Fredrik på mcf.se"
              isOnline={isOnline}
            />
          </p>
          {/* One narrower column, so each card's text and drawing share its width. */}
          <div className="max-w-2xl">
            <ul className="mt-6 space-y-6">
              {state.data.items.map((signal) => (
                <li key={signal.id}>
                  <SignalCard signal={signal} isOnline={isOnline} />
                </li>
              ))}
            </ul>

            <KrisinfoSourcesCard
              headingId="signal-sources-heading"
              intro="Signalerna och texterna bygger på följande källor:"
              sources={collectSources([...state.data.items, state.data])}
              isOnline={isOnline}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default WarningSignalsPage
