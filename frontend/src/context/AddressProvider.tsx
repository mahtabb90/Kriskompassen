import type { ReactNode } from "react"
import { useSavedAddresses } from "../hooks/useSavedAddresses"
import { AddressContext } from "./addressContext"

/**
 * Loads saved addresses once for the whole app, so the header indicator and the address
 * management page share one live list instead of reading IndexedDB independently.
 */
export function AddressProvider({ children }: { children: ReactNode }) {
  const value = useSavedAddresses()

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
}
