/** How long the install instructions stay hidden after the user closes them. */
export const INSTALL_INSTRUCTIONS_HIDDEN_DAYS = 30

const storageKey = "kriskompassen.installInstructionsDismissedAt"
const hiddenMilliseconds = INSTALL_INSTRUCTIONS_HIDDEN_DAYS * 24 * 60 * 60 * 1000

/**
 * Checks whether the user closed the install instructions within the hidden period.
 *
 * Unavailable storage, a corrupt value and a future timestamp all count as not dismissed, so a
 * wrong device clock cannot hide the instructions indefinitely. Never throws.
 *
 * @param now Current time in milliseconds since the epoch.
 * @returns True while a stored dismissal is younger than the hidden period.
 */
export function isInstallInstructionsDismissed(now = Date.now()): boolean {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) return false
    const elapsed = now - Number(stored)
    return elapsed >= 0 && elapsed < hiddenMilliseconds
  } catch {
    return false
  }
}

/**
 * Stores the time the user closed the install instructions in `localStorage`.
 *
 * A failed write is ignored, because the instructions showing again later is harmless. Never
 * throws.
 *
 * @param now Current time in milliseconds since the epoch.
 */
export function dismissInstallInstructions(now = Date.now()): void {
  try {
    localStorage.setItem(storageKey, String(now))
  } catch {
    // Private mode or strict settings can block storage; the app keeps working without it.
  }
}
