import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMode } from "../context/modeContext"
import { mockCrisisData } from "../data/mockCrisisData"
import { getOfflineItem } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"
import OfflineToggle from "./OfflineToggle"

type OfflineDetailState =
  { id: string; status: "ready"; item: CrisisItem | undefined } | { id: string; status: "error" }

/**
 * Renders detailed information for the selected crisis item in the current mode.
 *
 * Online mode reads from the bundled mock dataset; offline mode reads the item from
 * IndexedDB instead, making no network call. If the item is not available in the current
 * mode — whether because the mode was just switched or the URL was opened directly — this
 * redirects to the crisis list with an explanation, rather than showing an inline message.
 */
function DetailedCrisisCard() {
  const { id } = useParams()
  const { mode } = useMode()
  const navigate = useNavigate()
  const [offlineState, setOfflineState] = useState<OfflineDetailState>()

  useEffect(() => {
    if (mode !== "offline" || !id) return

    let cancelled = false

    getOfflineItem(id)
      .then((stored) => {
        if (!cancelled) setOfflineState({ id, status: "ready", item: stored })
      })
      .catch(() => {
        if (!cancelled) setOfflineState({ id, status: "error" })
      })

    return () => {
      cancelled = true
    }
  }, [mode, id])

  const onlineItem = id ? mockCrisisData.find((crisis) => crisis.id === id) : undefined
  // State from a previously viewed item or mode must not be shown for a different one.
  const currentOffline = mode === "offline" && offlineState?.id === id ? offlineState : undefined

  const status: "loading" | "error" | "ready" =
    mode === "online" ? "ready" : !currentOffline ? "loading" : currentOffline.status
  const item =
    mode === "online"
      ? onlineItem
      : currentOffline?.status === "ready"
        ? currentOffline.item
        : undefined

  useEffect(() => {
    if (status !== "ready" || item) return

    navigate("/crisis", {
      replace: true,
      state: {
        notice:
          mode === "online"
            ? "Den informationen hittades inte."
            : "Den informationen är inte sparad för offline-åtkomst.",
      },
    })
  }, [status, item, mode, navigate])

  if (status === "error") {
    return (
      <section>
        <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
          Det gick inte att läsa den sparade informationen
        </h1>
        <p role="alert" className="mt-4 max-w-prose leading-relaxed text-slate-700">
          Informationen kunde inte läsas från din enhet. Ladda om sidan och försök igen. Om felet
          kvarstår kan webbläsaren blockera lokal lagring.
        </p>
        <Link to="/crisis" className="mt-6 inline-block font-medium text-blue-900 underline">
          ← Tillbaka till krisinformation
        </Link>
      </section>
    )
  }

  if (status === "loading" || !item) {
    return (
      <section>
        <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
          Läser…
        </h1>
        <p role="status" className="sr-only">
          Läser…
        </p>
      </section>
    )
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900" />
        <span className="h-full w-8 bg-amber-400" />
      </div>

      <div className="p-6 sm:p-8">
        <Link to="/crisis" className="mb-6 inline-block font-medium text-blue-900 underline">
          ← Tillbaka till krisinformation
        </Link>

        <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
          {item.title}
        </h1>

        <p className="mt-6 text-base leading-relaxed text-slate-700">{item.content}</p>

        {mode === "offline" &&
          (item.savedAt ? (
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-medium">Sparad offline:</span>{" "}
              {new Date(item.savedAt).toLocaleString("sv-SE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">Tidpunkt för sparande saknas</p>
          ))}

        <div className="mt-8">
          <OfflineToggle item={item} />
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            Källa: <span className="font-medium">{item.source}</span>
          </p>

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-blue-900 underline"
            >
              Läs mer på källan
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default DetailedCrisisCard
