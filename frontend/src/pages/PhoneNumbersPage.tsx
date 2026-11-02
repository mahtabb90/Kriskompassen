import PhoneCard from "../components/PhoneCard"
import { useKrisinfo } from "../hooks/useKrisinfo"
import type { ContentSource, ListSection, Phone } from "../types/krisinfo"

// The content date is a calendar date, so it is formatted in UTC to avoid shifting the day.
const verifiedDateFormat = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function formatVerifiedDate(date: string): string {
  return verifiedDateFormat.format(new Date(`${date}T00:00:00Z`))
}

const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"

interface VerifiedSource {
  source: ContentSource
  lastVerified: string
}

/**
 * Lists each distinct source once, in order of first use by the numbers and then the section.
 *
 * A source used by several posts shows the oldest `lastVerified` among them, so the page never
 * claims a more recent check than every one of those posts has had.
 */
function collectSources(section: ListSection<Phone>): VerifiedSource[] {
  const byUrl = new Map<string, VerifiedSource>()
  for (const post of [...section.items, section]) {
    const known = byUrl.get(post.source.url)
    if (!known) {
      byUrl.set(post.source.url, { source: post.source, lastVerified: post.lastVerified })
    } else if (post.lastVerified < known.lastVerified) {
      known.lastVerified = post.lastVerified
    }
  }
  return [...byUrl.values()]
}

/**
 * Lists important phone numbers from the bundled krisinfo content with click-to-call links,
 * numbers for calls from abroad, and every source with its check date.
 *
 * Reads through `useKrisinfo`, so the list is available offline once the app is installed and
 * makes no network request. It is the only reader of the content; each `PhoneCard` receives
 * its number as props, in content order. The page heading stays mounted across loading states
 * so the layout can name and focus it.
 */
function PhoneNumbersPage() {
  const { state, retry } = useKrisinfo("phone-numbers")

  return (
    <section>
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
          <ul className="mt-6 space-y-6">
            {state.data.items.map((phone) => (
              <li key={phone.number}>
                <PhoneCard phone={phone} />
              </li>
            ))}
          </ul>

          <section aria-labelledby="phone-sources-heading" className={`mt-8 ${CARD_CLASSES}`}>
            <h2 id="phone-sources-heading" className="text-lg font-semibold text-blue-900">
              Källor
            </h2>
            <p className="mt-3 text-slate-700">Numren och texterna bygger på följande källor:</p>
            <ul className="mt-4 space-y-3">
              {collectSources(state.data).map(({ source, lastVerified }) => (
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
        </>
      )}
    </section>
  )
}

export default PhoneNumbersPage
