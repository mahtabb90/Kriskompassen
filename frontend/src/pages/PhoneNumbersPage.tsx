import { useKrisinfo } from "../hooks/useKrisinfo"
import type { ContentSource, ListSection, Phone } from "../types/krisinfo"
import { toTelHref } from "../utils/phoneLink"

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

const CALL_LINK_BASE =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-5 py-3 font-semibold wrap-anywhere"
const PRIMARY_CALL_CLASSES = `${CALL_LINK_BASE} bg-blue-900 text-white hover:bg-blue-950 active:bg-blue-950`
const SECONDARY_CALL_CLASSES = `${CALL_LINK_BASE} border-2 border-blue-900 bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-50`
const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
// The "Vid akut fara" panel from the calm page, reused to set the emergency number apart.
const EMERGENCY_PANEL_CLASSES = "rounded-2xl border-2 border-blue-900 bg-blue-50 p-6 sm:p-8"

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
 * makes no network request. Each number is plain text outside its links, so it can be selected
 * and copied on devices that cannot place calls. Each heading holds both the number and the
 * label, so heading navigation names the service, and each link's accessible name starts with
 * its visible text. The emergency number is set apart with a visible label, the emergency panel
 * and a primary button, so the distinction never relies on colour alone. The page heading stays
 * mounted across loading states so the layout can name and focus it.
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
              <li
                key={phone.number}
                className={phone.isEmergency ? EMERGENCY_PANEL_CLASSES : CARD_CLASSES}
              >
                {phone.isEmergency && (
                  <p className="mb-2 text-sm font-semibold text-blue-900">Akut nödnummer</p>
                )}
                <h2 className="wrap-anywhere text-blue-900">
                  <span className="block text-3xl font-bold tabular-nums">{phone.number}</span>{" "}
                  <span className="mt-1 block text-lg font-semibold">{phone.label}</span>
                </h2>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700">
                  {phone.whenToUse}
                </p>
                <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-700">
                  {phone.description}
                </p>
                <a
                  href={toTelHref(phone.number)}
                  aria-label={
                    phone.isEmergency
                      ? `Ring ${phone.number}, akut nödnummer`
                      : `Ring ${phone.number}, ${phone.label}`
                  }
                  className={`mt-4 ${phone.isEmergency ? PRIMARY_CALL_CLASSES : SECONDARY_CALL_CLASSES}`}
                >
                  Ring {phone.number}
                </a>
                {phone.abroadNumber && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-600">
                      Från utlandet eller utländsk telefon:{" "}
                      <span className="font-semibold whitespace-nowrap text-slate-800 tabular-nums">
                        {phone.abroadNumber}
                      </span>
                    </p>
                    <a
                      href={toTelHref(phone.abroadNumber)}
                      aria-label={`Ring från utlandet eller med utländsk telefon till ${phone.number}, ${phone.abroadNumber}`}
                      className={`mt-2 ${SECONDARY_CALL_CLASSES}`}
                    >
                      Ring från utlandet
                    </a>
                  </div>
                )}
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
