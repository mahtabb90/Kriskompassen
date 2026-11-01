/** The manual install instruction a platform needs; none means no instruction applies. */
export type InstallPlatform = "ios" | "macos-safari" | "none"

/** The browser values platform detection depends on. */
export interface InstallPlatformInputs {
  userAgent: string
  /** Number of supported touch points; separates iPadOS from a real Mac. */
  maxTouchPoints: number
  /** The iOS `navigator.standalone` signal. */
  navigatorStandalone: boolean
  /** Whether `(display-mode: standalone)` matches. */
  displayModeStandalone: boolean
}

const inAppBrowserTokens = /Instagram|FBAN|FBAV|FB_IAB|Messenger/
const appleMobileTokens = /iPhone|iPad/
const nonSafariMacTokens = /Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/

/**
 * Selects which manual install instruction a browser needs.
 *
 * User-agent checks are a deliberate exception to feature detection: Safari and all iOS/iPadOS
 * browsers fire no install event, so nothing else identifies them. Keep every user-agent rule in
 * this module.
 *
 * @remarks Other Mac browsers built on Safari's engine, such as Orion or DuckDuckGo, can send a
 * user agent that matches Safari and then receive the Safari instruction. This is an accepted
 * limitation.
 *
 * @param inputs The browser values to evaluate.
 * @returns The platform, or none when installed, in an in-app browser or on any other browser.
 */
export function detectInstallPlatform({
  userAgent,
  maxTouchPoints,
  navigatorStandalone,
  displayModeStandalone,
}: InstallPlatformInputs): InstallPlatform {
  if (!userAgent || navigatorStandalone || displayModeStandalone) return "none"
  if (inAppBrowserTokens.test(userAgent)) return "none"

  const hasSafariToken = userAgent.includes("Safari/")
  const isMacintosh = userAgent.includes("Macintosh")

  // iPadOS 13+ reports itself as a Mac, so this must run before the macOS check.
  if (appleMobileTokens.test(userAgent) || (isMacintosh && maxTouchPoints > 1)) {
    // Unlisted in-app browsers on iOS use a web view, which omits the Safari token.
    return hasSafariToken ? "ios" : "none"
  }

  // Chromium browsers on a Mac also send a Safari token, but no Version token.
  if (
    isMacintosh &&
    hasSafariToken &&
    userAgent.includes("Version/") &&
    !nonSafariMacTokens.test(userAgent)
  ) {
    return "macos-safari"
  }

  return "none"
}

/**
 * Reads the current browser's values and selects its manual install instruction.
 *
 * `navigator.standalone` counts as false when missing, because most browsers do not have it.
 *
 * @returns The platform, or none when `userAgent`, `maxTouchPoints` or `matchMedia` is unavailable.
 */
export function readInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "none"
  const { userAgent, maxTouchPoints, standalone } = navigator
  if (
    typeof userAgent !== "string" ||
    typeof maxTouchPoints !== "number" ||
    typeof window.matchMedia !== "function"
  ) {
    return "none"
  }

  return detectInstallPlatform({
    userAgent,
    maxTouchPoints,
    navigatorStandalone: standalone === true,
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
  })
}
