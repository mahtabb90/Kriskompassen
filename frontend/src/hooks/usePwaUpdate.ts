import { useSyncExternalStore } from "react"
import { pwaUpdateService } from "../services/pwaUpdateService"

/**
 * Subscribes to the shared updater without registering workers or owning browser listeners.
 *
 * @returns Current update state and the guarded, user-selected activation action.
 */
export function usePwaUpdate() {
  const state = useSyncExternalStore(pwaUpdateService.subscribe, pwaUpdateService.getSnapshot)
  return { ...state, applyUpdate: pwaUpdateService.applyUpdate }
}
