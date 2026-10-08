import type { PwaUpdateState } from "../services/pwaUpdateService"

interface PwaUpdateNoticeProps extends PwaUpdateState {
  applyUpdate: () => Promise<void>
}

/**
 * Presents a completed app update without stealing focus or interrupting a VMA announcement.
 *
 * Keeps the polite announcement region mounted even when no update is available. The layout
 * owns sticky placement and measured spacing; the visible region supports internal scrolling.
 *
 * @param status Update availability or the result of an explicit activation attempt.
 * @param applyUpdate Activates the prepared version and reloads once it controls this document.
 */
function PwaUpdateNotice({ status, applyUpdate }: PwaUpdateNoticeProps) {
  const announcement =
    status === "idle"
      ? ""
      : status === "updating"
        ? "Uppdaterar appen…"
        : status === "error"
          ? "Det gick inte att uppdatera appen. Försök igen."
          : "En ny version av appen finns tillgänglig."

  return (
    <>
      <p role="status" aria-label="Appuppdatering" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {status !== "idle" ? (
        <section
          aria-label="Uppdatering av appen"
          tabIndex={0}
          className="pwa-update-region rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm sm:p-6"
        >
          <p className="font-semibold text-blue-900">
            {status === "error"
              ? "Det gick inte att uppdatera appen. Försök igen."
              : "En ny version av appen finns tillgänglig"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Du kan fortsätta använda appen och uppdatera när det passar. Appen laddas om när du
            uppdaterar. Dina sparade artiklar finns kvar.
          </p>
          <button
            type="button"
            disabled={status === "updating"}
            onClick={() => void applyUpdate()}
            className={
              "mt-3 inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl " +
              "bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950 " +
              "active:bg-blue-950 disabled:opacity-60"
            }
          >
            {status === "updating" ? "Uppdaterar appen…" : "Uppdatera appen"}
          </button>
        </section>
      ) : null}
    </>
  )
}

export default PwaUpdateNotice
