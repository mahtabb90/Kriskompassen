import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import CrisisCard from "../components/CrisisCard"
import { getOfflineItems } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"

type OfflineListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; items: CrisisItem[] }

/**
 * Lists the crisis information the user has saved for offline access.
 *
 * Reads only from IndexedDB, so it makes no external requests. Items disappear from the list as
 * soon as they are removed, and the empty state appears after the last one is gone.
 */
function OfflinePage() {
  const [state, setState] = useState<OfflineListState>({ status: "loading" })
  const [removedMessage, setRemovedMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    getOfflineItems()
      .then((items) => {
        if (!cancelled) setState({ status: "ready", items })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleToggle(item: CrisisItem, saved: boolean) {
    if (saved) return

    setState((current) =>
      current.status === "ready"
        ? { status: "ready", items: current.items.filter((other) => other.id !== item.id) }
        : current
    )
    // The card that held the success message unmounts, so the page announces the removal.
    setRemovedMessage(`"${item.title}" har tagits bort från offlinelagringen.`)
  }

  const panelClassName =
    "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Sparad krisinformation
      </h1>

      <div role="status" className="sr-only">
        {removedMessage}
      </div>

      {state.status === "loading" && (
        <p role="status" className={panelClassName}>
          Läser sparad information…
        </p>
      )}

      {state.status === "error" && (
        <div role="alert" className={panelClassName}>
          <p className="font-semibold text-red-800">
            Det gick inte att läsa den sparade informationen från din enhet.
          </p>
          <p className="mt-2">
            Ladda om sidan och försök igen. Om felet kvarstår kan webbläsaren blockera lokal
            lagring.
          </p>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className={panelClassName}>
          <p className="font-semibold text-blue-900">Ingen krisinformation är sparad offline.</p>
          <p className="mt-2">
            Öppna krisinformationen och välj ”Spara offline” på de artiklar du vill kunna läsa utan
            internetanslutning. De visas sedan här.
          </p>
          <Link
            to="/crisis"
            className="mt-4 inline-flex min-h-12 items-center font-medium text-blue-900 underline"
          >
            Gå till krisinformation
          </Link>
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {state.items.map((item) => (
            <CrisisCard
              key={item.id}
              item={item}
              linkPrefix="/offline"
              onToggle={(saved) => handleToggle(item, saved)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default OfflinePage
