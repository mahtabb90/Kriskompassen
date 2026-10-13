import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { useMode } from "../context/modeContext"
import type { VmaResult } from "../types/vma"
import { selectVmaBanner } from "../services/vmaBannerSelection"
import { reevaluateVmaMessages } from "../services/vmaMapper"
import { fetchVmas } from "../services/vmaService"
import { createVmaUpdateService } from "../services/vmaUpdateService"

/**
 * Keeps VMA information current for the layout and exposes presentation state plus manual retry.
 *
 * Owns one update service for the lifetime of the layout: it fetches on start when ModeProvider
 * reports connectivity, polls our backend, pauses offline and in hidden tabs, and shares one
 * in-flight request across StrictMode effect replays and retry. Failures retain the last
 * successful feed. Local timers and visibility changes re-evaluate CAP validity of that feed
 * without changing its check time. lastCheckedAt is the backend's last successful SR check.
 * Loading is reported only while no result exists, so retained warnings stay visible during every
 * check; retrying marks a pending manual retry. Without a result the state is otherwise
 * unavailable. A result is stale when the backend reports it, the latest request failed or the
 * device is offline. Background polls leave the presentation unchanged until they complete.
 *
 * @returns Banner selection with the ordered active messages, the complete retained feed for
 * detail validity, whether any successful result exists, request state and retry.
 */
export function useVmaBanner() {
  const { isOnline } = useMode()
  const [service] = useState(() => createVmaUpdateService({ fetchVmas, document }, isOnline))
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot)
  const [evaluated, setEvaluated] = useState<{
    from: VmaResult | null
    result: VmaResult | null
  }>({ from: state.result, result: state.result })
  let current = evaluated
  // A newly fetched feed replaces any locally re-evaluated copy of the previous one.
  if (evaluated.from !== state.result) {
    current = { from: state.result, result: state.result }
    setEvaluated(current)
  }
  const result = current.result

  useEffect(() => {
    service.start()
    return () => service.stop()
  }, [service])

  useEffect(() => {
    service.setOnline(isOnline)
  }, [service, isOnline])

  const retry = useCallback(() => {
    void service.retry()
  }, [service])

  useEffect(() => {
    if (!result) return

    const reevaluate = () => {
      setEvaluated((previous) => {
        if (!previous.result) return previous
        const evaluatedAt = Date.now()
        return {
          ...previous,
          result: {
            ...previous.result,
            messages: reevaluateVmaMessages(
              previous.result.messages,
              previous.result.source,
              evaluatedAt
            ),
            evaluatedAt: new Date(evaluatedAt).toISOString(),
          },
        }
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reevaluate()
    }
    const evaluatedAt = Date.parse(result.evaluatedAt)
    const boundaries = result.messages
      .flatMap((message) => [message.sentAt, ...message.details.map((info) => info.expires)])
      .map(Date.parse)
      .filter((time) => time > evaluatedAt)
    const nextBoundary = Math.min(...boundaries)
    // Browser timers overflow above a signed 32-bit delay. Recheck long intervals in steps.
    const timer = Number.isFinite(nextBoundary)
      ? setTimeout(reevaluate, Math.min(2_147_483_647, Math.max(0, nextBoundary - Date.now())))
      : undefined

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [result])

  // Before the first attempt completes there is nothing to report as unavailable yet.
  const loading = !result && isOnline && (state.checking !== "none" || !state.failed)
  return {
    ...selectVmaBanner(result),
    messages: result?.messages ?? [],
    hasResult: Boolean(result),
    loading,
    retrying: state.checking === "manual",
    unavailable: !result && !loading,
    // Offline, retained data can no longer be refreshed and is presented as possibly outdated.
    stale: Boolean(result && (result.stale || state.failed || !isOnline)),
    offline: !isOnline,
    lastCheckedAt: result?.checkedAt ?? null,
    retry,
  }
}
