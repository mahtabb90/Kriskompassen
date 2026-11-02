import { useKrisinfo } from "../hooks/useKrisinfo"

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

// TODO(team): Expand this into the full phone numbers view with tel: links, its own design and
// a navigation entry. It is intentionally minimal and only shows the shared content model.
/**
 * Lists important phone numbers from the bundled krisinfo content, with source and check date.
 *
 * Reads through `useKrisinfo`, so the list is available offline once the app is installed. The
 * heading stays mounted across loading states so the layout can name and focus it.
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
          <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
            {state.data.summary}
          </p>
          <ul className="mt-6 space-y-6">
            {state.data.items.map((phone) => (
              <li key={phone.number}>
                <h2 className="wrap-anywhere text-xl font-bold text-blue-900">
                  {phone.number} – {phone.label}
                </h2>
                <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-700">
                  {phone.whenToUse}
                </p>
                <p className="mt-1 max-w-prose text-base leading-relaxed text-slate-700">
                  {phone.description}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-600">
            Källa:{" "}
            <a
              href={state.data.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4"
            >
              {state.data.source.name} (öppnas i ny flik)
            </a>
          </p>
          <p className="text-sm text-slate-600">
            Senast kontrollerad: {formatVerifiedDate(state.data.lastVerified)}
          </p>
        </>
      )}
    </section>
  )
}

export default PhoneNumbersPage
