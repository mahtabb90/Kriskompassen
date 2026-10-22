import type { BeforeInstallPromptEvent } from "../types/pwa"

/** Whether the app can currently open the browser's install prompt. */
export interface InstallPromptState {
  canInstall: boolean
}

/** The result of an install request; unavailable means no prompt could be shown. */
export type InstallOutcome = "accepted" | "dismissed" | "unavailable"

/** The window members the install prompt store listens to; `matchMedia` may be missing. */
export type InstallPromptWindow = Pick<Window, "addEventListener" | "removeEventListener"> & {
  matchMedia?: Window["matchMedia"]
}

const standaloneQuery = "(display-mode: standalone)"
const unavailableState: InstallPromptState = { canInstall: false }
const availableState: InstallPromptState = { canInstall: true }

/**
 * Creates a store that keeps the browser's deferred install prompt for a user-selected install.
 *
 * Relies on feature detection only: installation is offered while a `beforeinstallprompt` event
 * is retained and the app does not run in standalone display mode. The event is dropped after
 * use, on `appinstalled` and when the user declines, so the offer returns only if the browser
 * fires a new event. Never changes storage or service worker state.
 *
 * @param browserWindow Window to listen on, or null outside the browser.
 * @returns An idempotent starter, stable external-store methods, the install action and cleanup.
 */
export function createInstallPromptService(browserWindow: InstallPromptWindow | null) {
  let state = unavailableState
  let started = false
  let deferred: BeforeInstallPromptEvent | null = null
  let standalone = false
  let standaloneMedia: MediaQueryList | undefined
  const subscribers = new Set<() => void>()

  function publish() {
    const next = deferred && !standalone ? availableState : unavailableState
    if (state === next) return
    state = next
    subscribers.forEach((notify) => notify())
  }

  const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
    event.preventDefault()
    deferred = event
    publish()
  }
  const onAppInstalled = () => {
    deferred = null
    publish()
  }
  const onDisplayModeChange = (event: MediaQueryListEvent) => {
    standalone = event.matches
    publish()
  }

  /** Starts listening once; called before React renders because the event can fire early. */
  function start() {
    if (started || !browserWindow) return
    started = true
    browserWindow.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    browserWindow.addEventListener("appinstalled", onAppInstalled)
    if (typeof browserWindow.matchMedia === "function") {
      standaloneMedia = browserWindow.matchMedia(standaloneQuery)
      standalone = standaloneMedia.matches
      // Engines with only the deprecated addListener still provide the initial value.
      if (typeof standaloneMedia.addEventListener === "function") {
        standaloneMedia.addEventListener("change", onDisplayModeChange)
      }
    }
    publish()
  }

  /**
   * Opens the browser's install prompt with the retained event and waits for the user's choice.
   *
   * The event is cleared before prompting, so the offer disappears and repeated activation cannot
   * prompt twice.
   *
   * @returns The user's choice, or unavailable when no event is retained or prompting fails.
   */
  async function promptInstall(): Promise<InstallOutcome> {
    const event = deferred
    if (!event || standalone) return "unavailable"
    deferred = null
    publish()
    try {
      await event.prompt()
      return (await event.userChoice).outcome
    } catch {
      return "unavailable"
    }
  }

  /** Removes listeners and forgets any retained event. */
  function dispose() {
    started = false
    deferred = null
    standalone = false
    browserWindow?.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    browserWindow?.removeEventListener("appinstalled", onAppInstalled)
    if (typeof standaloneMedia?.removeEventListener === "function") {
      standaloneMedia.removeEventListener("change", onDisplayModeChange)
    }
    standaloneMedia = undefined
    publish()
  }

  return {
    start,
    promptInstall,
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

/** Shared document-scoped owner; bootstrap starts it before the first render. */
export const installPromptService = createInstallPromptService(
  typeof window === "undefined" ? null : window
)
