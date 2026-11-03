import BackLink from "../components/BackLink"
import KrisinfoSourcesCard from "../components/KrisinfoSourcesCard"
import PhoneCard from "../components/PhoneCard"
import { useMode } from "../context/modeContext"
import { useKrisinfo } from "../hooks/useKrisinfo"
import { collectSources } from "../utils/krisinfoSources"

/**
 * Lists important phone numbers from the bundled krisinfo content with click-to-call links,
 * numbers for calls from abroad, and every source with its check date.
 *
 * Reads through `useKrisinfo`, so the list is available offline once the app is installed and
 * makes no network request. It is the only reader of the content; each `PhoneCard` receives
 * its number as props, in content order. Sources are listed in order of first use by the
 * numbers and then the section; browser connectivity from `useMode()` lets their links say
 * when they need internet. The page heading stays mounted across loading states so the layout
 * can name and focus it; a link back to the krisinfo overview sits above it.
 */
function PhoneNumbersPage() {
  const { state, retry } = useKrisinfo("phone-numbers")
  const { isOnline } = useMode()

  return (
    <section>
      <BackLink to="/krisinformation" label="Tillbaka till krisinformation" />
      <h1
        id="page-heading"
        tabIndex={-1}
        className="wrap-anywhere text-3xl font-bold text-blue-900"
      >
        Viktiga telefonnummer
      </h1>

      {state.status === "loading" && (
        <p role="status" className="mt-4">
          Läser in telefonnummer…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-4">
          <p role="alert" className="text-red-800">
            Telefonnumren kunde inte visas. Försök igen.
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
          {/* The same column width as the warning signals page, so the krisinfo pages match. */}
          <div className="max-w-2xl">
            <ul className="mt-6 space-y-6">
              {state.data.items.map((phone) => (
                <li key={phone.number}>
                  <PhoneCard phone={phone} />
                </li>
              ))}
            </ul>

            <KrisinfoSourcesCard
              headingId="phone-sources-heading"
              intro="Numren och texterna bygger på följande källor:"
              sources={collectSources([...state.data.items, state.data])}
              isOnline={isOnline}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default PhoneNumbersPage
