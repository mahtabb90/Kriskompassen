import { useState } from "react"
import type { InstallState } from "../types/pwa"
import { readInstallPlatform, type InstallPlatform } from "../utils/installPlatform"
import { useInstallPrompt } from "./useInstallPrompt"

const instructionStates: Record<InstallPlatform, InstallState> = {
  ios: "ios-instructions",
  "macos-safari": "macos-instructions",
  none: "none",
}

/**
 * Selects the single install offer to present, so the button and instructions never show together.
 *
 * A retained browser install prompt takes priority over any instruction. The platform is read once
 * per mount. Closing the instructions does not affect this state; `InstallInstructions` handles
 * that, so a dismissal can never hide the install button.
 *
 * @returns The install offer that applies to this browser right now.
 */
export function useInstallState(): InstallState {
  const { canInstall } = useInstallPrompt()
  const [platform] = useState(readInstallPlatform)

  return canInstall ? "button" : instructionStates[platform]
}
