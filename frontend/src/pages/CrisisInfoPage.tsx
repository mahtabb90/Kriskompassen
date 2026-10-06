import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import CrisisCard from "../components/CrisisCard"
import { useMode } from "../context/modeContext"
import { mockCrisisData } from "../data/mockCrisisData"
import { getOfflineItems } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"

type OfflineListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; items: CrisisItem[] }

/**
 * Lists crisis information for the currently selected mode.
 *
 * Online mode shows the full bundled dataset. Offline mode reads only items saved for
 * offline access from IndexedDB, making no network call. Items disappear from the offline
 * list as soon as they are removed.
 */
function CrisisInfoPage() {
  const { mode } = useMode()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  const [offlineState, setOfflineState] = useState<OfflineListState>({ status: "loading" })
  const [removedMessage, setRemovedMessage] = useState("")

  useEffect(() => {
    if (mode !== "offline") return

    let cancelled = false

    getOfflineItems()
      .then((items) => {
        if (!cancelled) setOfflineState({ status: "ready", items })
      })
      .catch(() => {
        if (!cancelled) setOfflineState({ status: "error" })
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  function handleToggle(item: CrisisItem, saved: boolean) {
    if (saved) return

    setOfflineState((current) =>
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
        Krisinformation
      </h1>

      {notice && (
        <div role="alert" className={`${panelClassName} text-amber-900`}>
          {notice}
        </div>
      )}

      <div role="status" className="sr-only">
        {removedMessage}
      </div>

      {mode === "online" && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {mockCrisisData.map((item) => (
            <CrisisCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {mode === "offline" && offlineState.status === "loading" && (
        <p role="status" className={panelClassName}>
          Läser sparad information…
        </p>
      )}

      {mode === "offline" && offlineState.status === "error" && (
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

      {mode === "offline" && offlineState.status === "ready" && offlineState.items.length === 0 && (
        <div className={panelClassName}>
          <p className="font-semibold text-blue-900">Ingen krisinformation är sparad offline.</p>
          <p className="mt-2">
            Växla till online-läge och välj "Spara offline" på de artiklar du vill kunna läsa utan
            internetanslutning. De visas sedan här.
          </p>
        </div>
      )}

      {mode === "offline" && offlineState.status === "ready" && offlineState.items.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {offlineState.items.map((item) => (
            <CrisisCard key={item.id} item={item} onToggle={(saved) => handleToggle(item, saved)} />
          ))}
        </div>
      )}
    </section>
  )
}

export default CrisisInfoPage
