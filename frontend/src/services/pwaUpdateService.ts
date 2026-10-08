/** Describes an update offer or an explicit activation attempt, not network-check progress. */
export interface PwaUpdateState {
  status: "idle" | "ready" | "updating" | "error"
}

/** Supplies the document, connectivity and reload boundaries for the update lifecycle. */
export interface PwaUpdateEnvironment {
  enabled: boolean
  serviceWorker: ServiceWorkerContainer | undefined
  document: Document
  window: Window
  isOnline: () => boolean
  reload: () => void
}

const idleState: PwaUpdateState = { status: "idle" }
const checkTimeoutMs = 10_000
const activationTimeoutMs = 15_000

/**
 * Creates a store owning one registration and user-authorized reloads for the current document.
 *
 * Checks on start and visible lifecycle/connectivity events. Network failures remain silent;
 * explicit activation failures become retryable UI state. Never changes IndexedDB or clears
 * application caches. Only a selected, completed update can reload the current document.
 *
 * @param environment Browser boundaries, or null outside the browser.
 * @returns An idempotent starter, stable external-store methods, update actions and cleanup.
 */
export function createPwaUpdateService(environment: PwaUpdateEnvironment | null) {
  let state = idleState
  let started = false
  let registration: ServiceWorkerRegistration | undefined
  let configuredRegistration = false
  let baselineController: ServiceWorker | null = null
  let activationTarget: ServiceWorker | null = null
  let reloaded = false
  let generation = 0
  let pending: Promise<void> | null = null
  let foregroundQueued = false
  let checkTimer: number | undefined
  let activationTimer: number | undefined
  let registrationCleanup: (() => void) | undefined
  const subscribers = new Set<() => void>()
  const workerCleanups = new Map<ServiceWorker, () => void>()
  const container = environment?.serviceWorker

  function publish(status: PwaUpdateState["status"]) {
    if (state.status === status) return
    state = { status }
    subscribers.forEach((notify) => notify())
  }

  function clearActivation() {
    environment?.window.clearTimeout(activationTimer)
    activationTimer = undefined
    activationTarget = null
  }

  function failActivation() {
    clearActivation()
    publish("error")
  }

  function reloadOnce() {
    if (reloaded || !environment) return
    reloaded = true
    clearActivation()
    publish("updating")
    try {
      environment.reload()
    } catch {
      reloaded = false
      publish("error")
    }
  }

  function watchWorker(worker: ServiceWorker | null) {
    if (
      !worker ||
      workerCleanups.has(worker) ||
      worker.state === "activated" ||
      worker.state === "redundant"
    )
      return
    const onStateChange = () => {
      if (worker.state === "redundant" && worker === activationTarget) failActivation()
      // The registration's waiting slot can be assigned after the worker state changes.
      queueMicrotask(() => {
        if (started) reconcile()
      })
      if (worker.state === "activated" || worker.state === "redundant") {
        workerCleanups.get(worker)?.()
        workerCleanups.delete(worker)
      }
    }
    worker.addEventListener("statechange", onStateChange)
    workerCleanups.set(worker, () => worker.removeEventListener("statechange", onStateChange))
  }

  function controllerChanged() {
    return Boolean(
      container?.controller && baselineController && container.controller !== baselineController
    )
  }

  function reconcile() {
    if (!registration || reloaded) return
    watchWorker(registration.installing)
    watchWorker(registration.waiting)
    if (state.status === "updating") return
    if (
      controllerChanged() ||
      (registration.active && registration.waiting?.state === "installed")
    ) {
      publish("ready")
    } else if (state.status !== "error") {
      publish("idle")
    }
  }

  function bindRegistration(next: ServiceWorkerRegistration) {
    if (registration !== next) {
      registrationCleanup?.()
      registration = next
      baselineController ??= container?.controller ?? next.active
      next.addEventListener("updatefound", reconcile)
      registrationCleanup = () => next.removeEventListener("updatefound", reconcile)
    }
    reconcile()
  }

  async function runCheck(attempt: number) {
    if (!container || !environment) return
    if (!registration) {
      const existing = await container.getRegistration("/")
      if (!started || generation !== attempt) return
      if (existing) bindRegistration(existing)
    }
    if (!environment.isOnline() || environment.document.visibilityState !== "visible") return
    if (!configuredRegistration) {
      const next = await container.register("/sw.js", { scope: "/", updateViaCache: "none" })
      if (!started || generation !== attempt) return
      configuredRegistration = true
      bindRegistration(next)
    } else {
      await registration?.update()
      if (started && generation === attempt) reconcile()
    }
  }

  /** Checks the existing registration, coalescing calls and swallowing network failures. */
  async function checkForUpdate(): Promise<void> {
    if (!started || !container || !environment) return
    reconcile()
    if (pending) return pending
    const attempt = ++generation
    const deadline = new Promise<void>((resolve) => {
      checkTimer = environment.window.setTimeout(resolve, checkTimeoutMs)
    })
    pending = Promise.race([runCheck(attempt), deadline])
      .catch(() => {
        // Connectivity hints do not guarantee that the update endpoint can be reached.
      })
      .finally(() => {
        if (generation !== attempt) return
        environment.window.clearTimeout(checkTimer)
        checkTimer = undefined
        generation++
        pending = null
        // A foreground event may occur after this attempt fetched the old publication.
        // Coalesce those events into one follow-up instead of losing their check entirely.
        if (foregroundQueued) {
          foregroundQueued = false
          if (started && !reloaded) void checkForUpdate()
        }
      })
    return pending
  }

  const onForeground = () => {
    if (environment?.document.visibilityState !== "visible") return
    if (pending) foregroundQueued = true
    else void checkForUpdate()
  }
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onForeground()
  }
  const onControllerChange = () => {
    const controller = container?.controller
    if (!controller || controller === baselineController) return
    if (
      activationTarget &&
      (controller === activationTarget || activationTarget.state === "activated")
    ) {
      reloadOnce()
    } else if (!baselineController) {
      // Claiming the first installation is not a user-requested update.
      baselineController = controller
      reconcile()
    } else {
      // Another client may activate the worker, but this document still owns its reload choice.
      reconcile()
    }
  }

  /** Starts browser listeners once; registration never delays React rendering. */
  function start() {
    if (started || !environment?.enabled || !container) return
    started = true
    baselineController = container.controller
    container.addEventListener("controllerchange", onControllerChange)
    environment.document.addEventListener("visibilitychange", onForeground)
    environment.window.addEventListener("focus", onForeground)
    environment.window.addEventListener("online", onForeground)
    environment.window.addEventListener("pageshow", onPageShow)
    void checkForUpdate()
  }

  /** Activates a completed update on explicit selection, including an already-cached offline update. */
  async function applyUpdate(): Promise<void> {
    if (!started || !environment || state.status === "updating" || reloaded) return
    if (controllerChanged()) {
      reloadOnce()
      return
    }
    const waiting = registration?.waiting
    if (!waiting || waiting.state !== "installed") {
      publish("error")
      void checkForUpdate()
      return
    }
    activationTarget = waiting
    publish("updating")
    activationTimer = environment.window.setTimeout(failActivation, activationTimeoutMs)
    try {
      waiting.postMessage({ type: "SKIP_WAITING" })
    } catch {
      failActivation()
    }
  }

  /** Removes listeners and timers; late registration responses cannot revive a disposed store. */
  function dispose() {
    started = false
    generation++
    pending = null
    foregroundQueued = false
    configuredRegistration = false
    environment?.window.clearTimeout(checkTimer)
    checkTimer = undefined
    clearActivation()
    registrationCleanup?.()
    registrationCleanup = undefined
    workerCleanups.forEach((cleanup) => cleanup())
    workerCleanups.clear()
    registration = undefined
    reloaded = false
    container?.removeEventListener("controllerchange", onControllerChange)
    environment?.document.removeEventListener("visibilitychange", onForeground)
    environment?.window.removeEventListener("focus", onForeground)
    environment?.window.removeEventListener("online", onForeground)
    environment?.window.removeEventListener("pageshow", onPageShow)
    publish("idle")
  }

  return {
    start,
    checkForUpdate,
    applyUpdate,
    dispose,
    getSnapshot: () => state,
    subscribe: (notify: () => void) => {
      subscribers.add(notify)
      return () => {
        subscribers.delete(notify)
      }
    },
  }
}

/** Shared document-scoped owner; bootstrap starts it only in secure production builds. */
export const pwaUpdateService = createPwaUpdateService(
  typeof window === "undefined"
    ? null
    : {
        enabled: import.meta.env.PROD && window.isSecureContext,
        serviceWorker: "serviceWorker" in navigator ? navigator.serviceWorker : undefined,
        document,
        window,
        isOnline: () => navigator.onLine,
        reload: () => window.location.reload(),
      }
)
