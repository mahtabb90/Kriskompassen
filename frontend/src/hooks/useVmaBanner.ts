import { useCallback, useEffect, useRef, useState } from "react"
import type { VmaResult } from "../types/vma"
import { selectVmaBanner } from "../services/vmaBannerSelection"
import { reevaluateVmaMessages } from "../services/vmaMapper"
import { fetchVmas } from "../services/vmaService"

interface RequestState {
  result: VmaResult | null
  status: "loading" | "retrying" | "success" | "error"
  lastCheckedAt: string | null
}

/**
 * Loads VMA once per layout mount and exposes presentation state plus manual retry.
 *
 * Shares an in-flight request across StrictMode effect replays. Ignores completion after unmount
 * and retains the last successful feed on failure. Local timers and visibility changes re-evaluate
 * CAP validity without polling or persistent storage. Errors become explicit UI state, never [];
 * the last successful check time stays separate from local validity evaluation time.
 *
 * @returns Banner selection, loading/error state, last successful check and a guarded retry action.
 */
export function useVmaBanner() {
  const [state, setState] = useState<RequestState>({
    result: null,
    status: "loading",
    lastCheckedAt: null,
  })
  const mounted = useRef(false)
  const pending = useRef<Promise<VmaResult> | null>(null)

  const request = useCallback(() => {
    if (pending.current) return
    const response = fetchVmas()
    pending.current = response
    void response
      .then(
        (result) => {
          if (mounted.current) {
            setState({ result, status: "success", lastCheckedAt: result.evaluatedAt })
          }
        },
        () => {
          if (mounted.current) setState((previous) => ({ ...previous, status: "error" }))
        }
      )
      .finally(() => {
        pending.current = null
      })
  }, [])

  useEffect(() => {
    mounted.current = true
    request()
    return () => {
      mounted.current = false
    }
  }, [request])

  const retry = useCallback(() => {
    if (pending.current || !mounted.current) return
    setState((previous) => ({ ...previous, status: "retrying" }))
    request()
  }, [request])

  useEffect(() => {
    const result = state.result
    if (!result) return

    const reevaluate = () => {
      setState((previous) => {
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
  }, [state.result])

  return {
    ...selectVmaBanner(state.result),
    loading: state.status === "loading" || state.status === "retrying",
    retrying: state.status === "retrying",
    failed: state.status === "error",
    lastCheckedAt: state.lastCheckedAt,
    retry,
  }
}
