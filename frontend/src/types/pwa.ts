/** The user's answer to an install prompt opened through `BeforeInstallPromptEvent.prompt()`. */
export interface InstallPromptChoice {
  outcome: "accepted" | "dismissed"
  platform: string
}

/**
 * Event some browsers fire when the app meets their install criteria; not in TypeScript's DOM lib.
 *
 * Calling `preventDefault()` keeps the browser's own install infobar from appearing, so the app can
 * offer installation itself. `prompt()` can be called only once per event.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<InstallPromptChoice>
  prompt(): Promise<void>
}

/** The one install offer to present: the app's button, a manual instruction, or nothing. */
export type InstallState = "button" | "ios-instructions" | "macos-instructions" | "none"

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    appinstalled: Event
  }

  interface Navigator {
    /** True in an app started from the iOS home screen; missing from TypeScript's DOM lib. */
    readonly standalone?: boolean
  }
}
