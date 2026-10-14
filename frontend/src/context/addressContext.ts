import { createContext, useContext } from "react"
import type { useSavedAddresses } from "../hooks/useSavedAddresses"

export type AddressContextValue = ReturnType<typeof useSavedAddresses>

export const AddressContext = createContext<AddressContextValue | undefined>(undefined)

/**
 * Reads the shared saved-addresses state: the full list, the active address, and mutations.
 *
 * @throws If used outside an `AddressProvider`.
 */
export function useAddresses() {
  const context = useContext(AddressContext)
  if (!context) {
    throw new Error("useAddresses must be used within an AddressProvider")
  }
  return context
}
