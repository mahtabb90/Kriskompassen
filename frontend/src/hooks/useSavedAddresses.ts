import { useCallback, useEffect, useRef, useState } from "react"
import {
  getSavedAddresses,
  removeAddress,
  saveAddress,
  setActiveAddress,
} from "../services/addressStorageService"
import { prefetchNearestShelters } from "../services/shelterPrefetchService"
import type { Address, AddressLabel, SavedAddress } from "../types/address"

interface State {
  addresses: SavedAddress[]
  loading: boolean
}

/**
 * Owns the list of saved addresses and which one is active, backed by IndexedDB.
 *
 * Loads once on mount; every mutation re-reads the full list afterward so all consumers
 * (e.g. the header indicator and the address management page) stay in sync without
 * duplicating storage reads.
 */
export function useSavedAddresses() {
  const [state, setState] = useState<State>({ addresses: [], loading: true })
  const mounted = useRef(false)

  const refresh = useCallback(async () => {
    const addresses = await getSavedAddresses()
    if (mounted.current) setState({ addresses, loading: false })
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => {
      mounted.current = false
    }
  }, [refresh])

  /**
   * Saves a new address. Activates it automatically if it is the first one saved.
   *
   * When the saved address has coordinates, also kicks off a background prefetch of its
   * nearest shelters so they are already cached offline later - e.g. if MCF's service is
   * unreachable the next time this address is used. Never awaited: a slow or failed prefetch
   * must not delay or fail the save itself.
   */
  const addAddress = useCallback(
    async (address: Address, label: AddressLabel) => {
      const saved = await saveAddress(address, label)
      await refresh()
      if (typeof saved.lat === "number" && typeof saved.lon === "number") {
        void prefetchNearestShelters({ lat: saved.lat, lon: saved.lon })
      }
    },
    [refresh]
  )

  /** Makes one saved address active, deactivating every other saved address. */
  const setActive = useCallback(
    async (id: string) => {
      await setActiveAddress(id)
      await refresh()
    },
    [refresh]
  )

  /** Removes a saved address. If it was active, the first remaining address becomes active. */
  const remove = useCallback(
    async (id: string) => {
      await removeAddress(id)
      await refresh()
    },
    [refresh]
  )

  return {
    addresses: state.addresses,
    activeAddress: state.addresses.find((address) => address.isActive) ?? null,
    loading: state.loading,
    addAddress,
    setActive,
    remove,
  }
}
