import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { mockCrisisData } from "../data/mockCrisisData"
import { getOfflineItem } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"
import OfflineToggle from "./OfflineToggle"

interface DetailedCrisisCardProps {
  isOffline?: boolean
}

type OfflineDetailState =
  | { id: string | undefined; status: "ready"; item: CrisisItem | undefined }
  | { id: string | undefined; status: "error" }

/**
 * Renders detailed information for the selected crisis item.
 *
 * By default the item comes from the mock dataset. In offline mode it is read from IndexedDB
 * instead, makes no external requests, and only items saved for offline access are shown.
 *
 * @param isOffline Reads the item from IndexedDB and links back to the offline list.
 */
function DetailedCrisisCard({ isOffline = false }: DetailedCrisisCardProps) {
  const { id } = useParams()
  const [offlineState, setOfflineState] = useState<OfflineDetailState>()

  useEffect(() => {
    if (!isOffline || !id) return

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
  }, [isOffline, id])

  const backPath = isOffline ? "/offline" : "/crisis"
  const backLabel = isOffline
    ? "← Tillbaka till sparad krisinformation"
    : "← Tillbaka till krisinformation"
  const backLinkClassName = "inline-block font-medium text-blue-900 underline"

  if (isOffline) {
    // State from a previously viewed item must not be shown for a different route id.
    const current = offlineState?.id === id ? offlineState : undefined

    if (!current) {
      return (
        <section>
          <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
            Läser sparad information…
          </h1>
          <p role="status" className="sr-only">
            Läser sparad information…
          </p>
        </section>
      )
    }

    if (current.status === "error") {
      return (
        <section>
          <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
            Det gick inte att läsa den sparade informationen
          </h1>
          <p role="alert" className="mt-4 max-w-prose leading-relaxed text-slate-700">
            Informationen kunde inte läsas från din enhet. Ladda om sidan och försök igen. Om felet
            kvarstår kan webbläsaren blockera lokal lagring.
          </p>
          <Link to={backPath} className={`mt-6 ${backLinkClassName}`}>
            {backLabel}
          </Link>
        </section>
      )
    }

    if (!current.item) {
      return (
        <section>
          <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
            Informationen är inte tillgänglig offline
          </h1>
          <p className="mt-4 max-w-prose leading-relaxed text-slate-700">
            Den här informationen har inte sparats på din enhet och kan därför inte visas utan
            internetanslutning.
          </p>
          <Link to={backPath} className={`mt-6 ${backLinkClassName}`}>
            {backLabel}
          </Link>
        </section>
      )
    }
  }

  const item: CrisisItem | undefined = isOffline
    ? offlineState?.status === "ready"
      ? offlineState.item
      : undefined
    : mockCrisisData.find((crisis) => crisis.id === id)

  if (!item) {
    return (
      <section>
        <h1 className="text-3xl font-bold text-blue-900">Krisinformationen hittades inte</h1>

        <Link to={backPath} className={`mt-6 ${backLinkClassName}`}>
          {backLabel}
        </Link>
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
        <Link to={backPath} className={`mb-6 ${backLinkClassName}`}>
          {backLabel}
        </Link>

        <h1 className="text-3xl font-bold text-blue-900">{item.title}</h1>

        <p className="mt-6 text-base leading-relaxed text-slate-700">{item.content}</p>

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
