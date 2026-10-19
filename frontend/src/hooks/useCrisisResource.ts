import { useCallback, useEffect, useState } from "react"

export type CrisisResourceState<T> =
  | { status: "loading"; retrying?: boolean }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: T }

/**
 * Loads a resource per source key and attempt, never retaining data across mode or ID changes.
 *
 * The caller supplies a stable loader and a key containing the selected mode and resource ID.
 * Adjusts keyed state before children render, avoiding a frame of stale data. Cleanup aborts I/O
 * and ignores late resolutions even when a loader cannot be cancelled (including IndexedDB).
 * Retry starts a fresh attempt; updateData only applies to the current successful attempt.
 */
export function useCrisisResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [request, setRequest] = useState<{
    key: string
    attempt: number
    state: CrisisResourceState<T>
  }>({ key, attempt: 0, state: { status: "loading" } })

  if (request.key !== key) {
    setRequest({ key, attempt: request.attempt + 1, state: { status: "loading" } })
  }

  const { key: requestKey, attempt } = request
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function run() {
      try {
        const data = await load(controller.signal)
        if (active) {
          setRequest((current) =>
            current.key === requestKey && current.attempt === attempt
              ? { ...current, state: { status: "ready", data } }
              : current
          )
        }
      } catch (error) {
        if (active) {
          setRequest((current) =>
            current.key === requestKey && current.attempt === attempt
              ? { ...current, state: { status: "error", error } }
              : current
          )
        }
      }
    }
    void run()

    return () => {
      active = false
      controller.abort()
    }
  }, [load, requestKey, attempt])

  const retry = useCallback(() => {
    setRequest((current) =>
      current.state.status === "loading"
        ? current
        : {
            ...current,
            attempt: current.attempt + 1,
            state: { status: "loading", retrying: true },
          }
    )
  }, [])

  const updateData = useCallback(
    (update: (data: T) => T) => {
      setRequest((current) =>
        current.key === key && current.attempt === attempt && current.state.status === "ready"
          ? { ...current, state: { status: "ready", data: update(current.state.data) } }
          : current
      )
    },
    [key, attempt]
  )

  const state: CrisisResourceState<T> = request.key === key ? request.state : { status: "loading" }
  return { state, retry, updateData }
}
