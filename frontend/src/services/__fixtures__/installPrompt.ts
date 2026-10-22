import { vi } from "vitest"
import type { InstallPromptChoice } from "../../types/pwa"

/**
 * Creates a cancelable synthetic `beforeinstallprompt` event whose prompt resolves immediately.
 *
 * @param outcome The choice the simulated user makes in the browser's install prompt.
 * @returns The event with a spied `prompt()` for asserting how often it was opened.
 */
export function installPromptEvent(outcome: InstallPromptChoice["outcome"] = "accepted") {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    platforms: ["web"],
    userChoice: Promise.resolve<InstallPromptChoice>({ outcome, platform: "web" }),
    prompt: vi.fn().mockResolvedValue(undefined),
  })
}
