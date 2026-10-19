import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import CrisisCard from "../components/CrisisCard"
import CrisisLoadFeedback from "../components/CrisisLoadFeedback"
import { useMode, type Mode } from "../context/modeContext"
import { useCrisisResource } from "../hooks/useCrisisResource"
import { fetchCrisisItems } from "../services/crisisService"
import { getOfflineItems } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"

/**
 * Lists crisis information for the currently selected mode.
 *
 * Online mode fetches full articles from the backend on every entry into that mode.
 * Offline mode reads only items saved in IndexedDB, making no article network call.
 * Late results cannot cross modes. Removing an offline item moves keyboard focus to the next
 * remaining card, the previous one, or the page heading when none remain. Redirect notices are
 * shown only in the mode that produced them, including retained history state after a reload.
 */
function CrisisInfoPage() {
  const { mode } = useMode()
  const location = useLocation()
  const redirectNotice = location.state as { notice?: string; noticeMode?: Mode } | null
  const notice = redirectNotice?.noticeMode === mode ? redirectNotice.notice : undefined

  const load = useCallback(
    (signal: AbortSignal) => (mode === "online" ? fetchCrisisItems(signal) : getOfflineItems()),
    [mode]
  )
  const { state, retry, updateData } = useCrisisResource(mode, load)
  const [removedMessage, setRemovedMessage] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  // Card index to focus after the next offline list update, or "heading" when the list empties.
  const pendingFocus = useRef<number | "heading" | null>(null)

  useEffect(() => {
    const target = pendingFocus.current
    if (target === null) return
    pendingFocus.current = null

    if (target === "heading") {
      headingRef.current?.focus()
    } else {
      gridRef.current?.children[target]?.querySelector("a")?.focus()
    }
  }, [state])

  function handleToggle(item: CrisisItem, saved: boolean) {
    if (saved || mode !== "offline" || state.status !== "ready" || !gridRef.current) return

    const index = state.data.findIndex((other) => other.id === item.id)
    const active = document.activeElement
    const focusWasInCard =
      !active ||
      active === document.body ||
      Boolean(gridRef.current?.children[index]?.contains(active))
    const remaining = state.data.length - 1

    // Focus would otherwise fall to the document when the card unmounts. The next card
    // takes the removed card's index; after removing the last card, the previous one is used.
    if (index >= 0 && focusWasInCard) {
      pendingFocus.current = remaining === 0 ? "heading" : Math.min(index, remaining - 1)
    }

    updateData((items) => items.filter((other) => other.id !== item.id))
    // The card that held the success message unmounts, so the page announces the removal.
    setRemovedMessage(`"${item.title}" har tagits bort från offlinelagringen.`)
  }

  const panelClassName =
    "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

  return (
    <section>
      <h1
        ref={headingRef}
        id="page-heading"
        tabIndex={-1}
        className="text-3xl font-bold text-blue-900"
      >
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

      {state.status !== "ready" && (
        <div className={panelClassName}>
          <CrisisLoadFeedback state={state} mode={mode} onRetry={retry} headingRef={headingRef} />
        </div>
      )}

      {mode === "online" && state.status === "ready" && state.data.length === 0 && (
        <p role="status" className={panelClassName}>
          Inga artiklar finns att visa just nu.
        </p>
      )}

      {mode === "offline" && state.status === "ready" && state.data.length === 0 && (
        <div className={panelClassName}>
          <p className="font-semibold text-blue-900">Ingen krisinformation är sparad.</p>
          <p className="mt-2">
            Stäng av Sparad information och välj "Spara offline" på de artiklar du vill kunna läsa
            utan internetanslutning. De visas sedan här.
          </p>
        </div>
      )}

      {state.status === "ready" && state.data.length > 0 && (
        <div
          ref={mode === "offline" ? gridRef : undefined}
          className="mt-6 grid gap-6 sm:grid-cols-2"
        >
          {state.data.map((item) => (
            <CrisisCard
              key={item.id}
              item={item}
              onToggle={mode === "offline" ? (saved) => handleToggle(item, saved) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default CrisisInfoPage
