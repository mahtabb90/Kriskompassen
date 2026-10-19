import { useCallback, useEffect, useRef } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMode } from "../context/modeContext"
import { useCrisisResource } from "../hooks/useCrisisResource"
import { isSafeCrisisSourceUrl } from "../services/crisisResponseValidator"
import { fetchCrisisItem } from "../services/crisisService"
import { getOfflineItem } from "../services/offlineService"
import CrisisLoadFeedback from "./CrisisLoadFeedback"
import OfflineToggle from "./OfflineToggle"

/**
 * Renders detailed information for the selected crisis item in the current mode.
 *
 * Online mode fetches the selected article; offline mode reads the item from IndexedDB.
 * Mode/ID changes cancel and discard older requests. If the item is not available in the current
 * mode — whether because the mode was just switched or the URL was opened directly — this
 * redirects to the crisis list with an explanation tagged with the selected mode. The list
 * shows the explanation only while that mode is selected. Transport failures remain explicit
 * retryable errors. The same heading node survives loading, errors and successful responses.
 */
function DetailedCrisisCard() {
  const { id } = useParams()
  const { mode } = useMode()
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const load = useCallback(
    (signal: AbortSignal) => {
      if (!id) return Promise.resolve(undefined)
      return mode === "online" ? fetchCrisisItem(id, signal) : getOfflineItem(id)
    },
    [mode, id]
  )
  const { state, retry } = useCrisisResource(`${mode}:${id ?? ""}`, load)
  const status = state.status
  const item = state.status === "ready" ? state.data : undefined
  const sourceUrl = isSafeCrisisSourceUrl(item?.sourceUrl) ? item.sourceUrl : undefined
  const savedAt =
    item?.savedAt && Number.isFinite(Date.parse(item.savedAt)) ? item.savedAt : undefined

  useEffect(() => {
    if (status !== "ready" || item) return

    navigate("/crisis", {
      replace: true,
      state: {
        noticeMode: mode,
        notice:
          mode === "online"
            ? "Den informationen hittades inte."
            : "Den informationen är inte sparad för offline-åtkomst.",
      },
    })
  }, [status, item, mode, navigate])

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900" />
        <span className="h-full w-8 bg-amber-400" />
      </div>

      <div className="p-6 sm:p-8">
        <Link
          to="/crisis"
          className="mb-6 inline-flex min-h-12 items-center gap-1 font-medium text-blue-900 underline underline-offset-4"
        >
          <span aria-hidden="true">←</span>Tillbaka till krisinformation
        </Link>

        <h1
          ref={headingRef}
          id="page-heading"
          tabIndex={-1}
          className="wrap-anywhere text-3xl font-bold text-blue-900"
        >
          {item?.title ?? "Krisinformation"}
        </h1>

        {state.status !== "ready" && (
          <div className="mt-6 text-slate-600">
            <CrisisLoadFeedback state={state} mode={mode} onRetry={retry} headingRef={headingRef} />
          </div>
        )}

        {item && (
          <>
            <p className="mt-6 max-w-prose whitespace-pre-line wrap-anywhere text-base leading-relaxed text-slate-700">
              {item.content}
            </p>

            {mode === "offline" &&
              (savedAt ? (
                <p className="mt-4 text-sm text-slate-600">
                  <span className="font-medium">Sparad offline:</span>{" "}
                  {new Date(savedAt).toLocaleString("sv-SE", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Tidpunkt för sparande saknas</p>
              ))}

            <div className="mt-8">
              <OfflineToggle key={`${mode}:${item.id}`} item={item} />
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-600">
                Källa: <span className="font-medium">{item.source}</span>
              </p>

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4"
                >
                  Läs mer på källan (öppnas i ny flik)
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default DetailedCrisisCard
