import { useCallback, useEffect, useRef, useState } from "react"
import {
  GeolocationRequestError,
  describeGeolocationError,
  requestCurrentPosition,
} from "../services/geolocationService"
import type { GeoPoint } from "../utils/distance"

interface CurrentPositionState {
  position: GeoPoint | null
  /** The browser's own radius of uncertainty for the fetched position, in meters - lets the
   * caller flag an unusually imprecise fix, same signal AddressSection already surfaces for a
   * geolocated address (see LOW_ACCURACY_THRESHOLD_METERS in types/address.ts). */
  accuracy: number | null
  status: "idle" | "resolving" | "success" | "error"
  errorMessage: string
}

/**
 * Session-only, local state: fetches the device's current position via the browser's
 * Geolocation API for the shelter map's "Hämta aktuell position" button. Never calls the backend,
 * never persists anything (no IndexedDB, no saved/active address) - level 1 of the ticket's
 * staged scope; writing the result back to a saved address is a separate, later ticket.
 *
 * A failed fetch never discards a previously fetched position, mirroring useAddress's own
 * "never clears a previously confirmed address" rule - a transient second-click timeout should
 * not un-center a map that already successfully recentered once.
 *
 * `recenterToken` increments once per successful fetch, not whenever `position` happens to
 * change identity - the caller (AllSheltersMap) uses it to fire exactly one recenter per click,
 * decoupled from any other reason its own origin prop might change (e.g. the active address
 * changing elsewhere while this page is mounted, which must stay a no-op).
 *
 * `accuracy` is the browser's own radius of uncertainty for the fix, carried through
 * unchanged (no rounding/formatting here) so the caller can decide when a fix is imprecise
 * enough to flag, same threshold AddressSection already uses for a geolocated address.
 */
export function useCurrentPosition() {
  const [state, setState] = useState<CurrentPositionState>({
    position: null,
    accuracy: null,
    status: "idle",
    errorMessage: "",
  })
  const [recenterToken, setRecenterToken] = useState(0)
  const mounted = useRef(false)
  const pending = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const requestPosition = useCallback(() => {
    if (pending.current) return
    pending.current = true
    setState((previous) => ({ ...previous, status: "resolving", errorMessage: "" }))

    void requestCurrentPosition()
      .then((coordinates) => {
        if (!mounted.current) return
        setState({
          position: { lat: coordinates.lat, lon: coordinates.lon },
          accuracy: coordinates.accuracy,
          status: "success",
          errorMessage: "",
        })
        setRecenterToken((token) => token + 1)
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage:
            error instanceof GeolocationRequestError
              ? describeGeolocationError(error)
              : "Din position kunde inte hämtas. Försök igen.",
        }))
      })
      .finally(() => {
        pending.current = false
      })
  }, [])

  return {
    position: state.position,
    accuracy: state.accuracy,
    loading: state.status === "resolving",
    failed: state.status === "error",
    errorMessage: state.errorMessage,
    recenterToken,
    requestPosition,
  }
}
