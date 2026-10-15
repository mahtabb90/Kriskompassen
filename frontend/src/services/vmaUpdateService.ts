import { apiConfig } from "../config/apiConfig"
import type { VmaResult } from "../types/vma"

/**
 * Describes the shared VMA request state without deriving presentation text.
 *
 * result is the latest successful response, including a backend response marked stale; a failed
 * request never replaces it. checking is "initial" while the first request is pending, "manual"
 * while a user-started retry is pending and "none" for background polls, which stay silent.
 */
export interface VmaUpdateState {
  result: VmaResult | null
  /** Indicates that the latest completed request failed; the next success clears it. */
  failed: boolean
  checking: "none" | "initial" | "manual"
}

/** Supplies the request and visibility boundaries for the update lifecycle. */
export interface VmaUpdateEnvironment {
  fetchVmas: () => Promise<VmaResult>
  document: EventTarget & Pick<Document, "visibilityState">
}

const initialState: VmaUpdateState = { result: null, failed: false, checking: "none" }

/**
 * Creates the single path through which VMA information is fetched and refreshed.
 *
 * Start, the polling timer, reconnection, a tab becoming visible and manual retry all share one
 * in-flight request, so requests never overlap. The next poll is scheduled
 * apiConfig.vmaPollIntervalMs after the previous attempt completes, successful or not, and only
 * one timer exists at a time. Polling pauses while offline or hidden. Reconnection fetches
 * immediately; becoming visible fetches when the interval has elapsed. The first request runs on
 * start even in a hidden tab. Stopping removes the timer and listeners but keeps the data and any
 * pending request, so a StrictMode stop/start replay neither repeats nor loses the request.
 *
 * @param environment Request and document boundaries.
 * @param online Connectivity reported by ModeProvider when the service is created.
 * @returns Lifecycle controls, connectivity input, guarded retry and stable external-store methods.
 */
export function createVmaUpdateService(environment: VmaUpdateEnvironment, online: boolean) {
  let state = initialState
  let started = false
  let pending: Promise<void> | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastCompletedAt: number | null = null
  const subscribers = new Set<() => void>()

  function publish(next: Partial<VmaUpdateState>) {
    const changed = (Object.keys(next) as (keyof VmaUpdateState)[]).some(
      (key) => next[key] !== state[key]
    )
    if (!changed) return
    state = { ...state, ...next }
    subscribers.forEach((notify) => notify())
  }

  function clearTimer() {
    clearTimeout(timer)
    timer = undefined
  }

  function schedule() {
    clearTimer()
    if (!started || !online || pending || lastCompletedAt === null) return
    if (environment.document.visibilityState !== "visible") return
    const delay = Math.max(0, lastCompletedAt + apiConfig.vmaPollIntervalMs - Date.now())
    timer = setTimeout(() => {
      timer = undefined
      void request(false)
    }, delay)
  }

  function request(manual: boolean): Promise<void> {
    if (pending) {
      if (manual && state.checking === "none") publish({ checking: "manual" })
      return pending
    }
    if (!online) return Promise.resolve()
    clearTimer()
    publish({ checking: manual ? "manual" : lastCompletedAt === null ? "initial" : "none" })
    pending = environment
      .fetchVmas()
      .then(
        (result) => ({ result, failed: false }),
        () => ({ failed: true })
      )
      .then((outcome) => {
        pending = null
        lastCompletedAt = Date.now()
        publish({ ...outcome, checking: "none" })
        // Failures keep the same cadence so the app recovers without user action.
        schedule()
      })
    return pending
  }

  function resume() {
    if (!started || !online || pending) return
    if (lastCompletedAt === null) {
      void request(false)
    } else if (environment.document.visibilityState === "visible") {
      if (Date.now() - lastCompletedAt >= apiConfig.vmaPollIntervalMs) void request(false)
      else schedule()
    }
  }

  const onVisibilityChange = () => {
    if (environment.document.visibilityState === "visible") resume()
    else clearTimer()
  }

  /** Starts listening and fetches or schedules as needed; repeated calls have no effect. */
  function start() {
    if (started) return
    started = true
    environment.document.addEventListener("visibilitychange", onVisibilityChange)
    resume()
  }

  /** Removes the timer and listener while keeping data and a pending request for a restart. */
  function stop() {
    if (!started) return
    started = false
    clearTimer()
    environment.document.removeEventListener("visibilitychange", onVisibilityChange)
  }

  /** Pauses polling offline and fetches immediately when connectivity returns. */
  function setOnline(next: boolean) {
    if (next === online) return
    online = next
    if (!online) clearTimer()
    else if (started) void request(false)
  }

  /** Starts a user-visible request, or marks the pending one as user-visible. */
  function retry(): Promise<void> {
    if (!started) return Promise.resolve()
    return request(true)
  }

  return {
    start,
    stop,
    setOnline,
    retry,
    getSnapshot: () => state,
    subscribe: (notify: () => void) => {
      subscribers.add(notify)
      return () => {
        subscribers.delete(notify)
      }
    },
  }
}

/** Is the controller type that useVmaBanner owns for the lifetime of the layout. */
export type VmaUpdateService = ReturnType<typeof createVmaUpdateService>
