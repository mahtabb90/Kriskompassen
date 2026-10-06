import { createContext, useContext } from "react"

export type Mode = "online" | "offline"

export interface ModeContextValue {
  mode: Mode
  isOnline: boolean
  autoSwitchNotice: string | null
  setMode: (mode: Mode) => void
  dismissAutoSwitchNotice: () => void
}

export const ModeContext = createContext<ModeContextValue | undefined>(undefined)

/**
 * Reads the current online/offline mode and browser-reported connectivity.
 *
 * @throws If used outside a `ModeProvider`.
 */
export function useMode() {
  const context = useContext(ModeContext)
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider")
  }
  return context
}
