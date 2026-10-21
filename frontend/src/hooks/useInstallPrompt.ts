import { useSyncExternalStore } from "react"
import { installPromptService } from "../services/installPromptService"

/**
 * Subscribes to the shared install prompt store without owning browser listeners.
 *
 * @returns Whether installation can be offered, and the action that opens the browser's prompt.
 */
export function useInstallPrompt() {
  const { canInstall } = useSyncExternalStore(
    installPromptService.subscribe,
    installPromptService.getSnapshot
  )
  return { canInstall, promptInstall: installPromptService.promptInstall }
}
