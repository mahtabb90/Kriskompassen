import { useCallback, useEffect, useRef, useState } from "react"
import { GeocodeRequestError, fetchGeocode } from "../services/geocodingService"
import { GeolocationRequestError, requestCurrentPosition } from "../services/geolocationService"
import type { Address } from "../types/address"

interface AddressState {
  address: Address | null
  status: "idle" | "resolving" | "success" | "error"
  errorMessage: string
}

function describeGeolocationError(error: GeolocationRequestError): string {
  switch (error.code) {
    case "permission_denied":
      return "Platsbehörighet nekades. Du kan ange din adress manuellt istället."
    case "timeout":
      return "Det tog för lång tid att hämta din position. Försök igen eller ange adressen manuellt."
    case "unsupported":
      return "Den här webbläsaren stöder inte platshämtning. Ange adressen manuellt istället."
    case "position_unavailable":
      return "Din position kunde inte fastställas. Försök igen eller ange adressen manuellt."
  }
}

function describeGeocodeError(error: GeocodeRequestError): string {
  switch (error.code) {
    case "timeout":
      return "Det tog för lång tid att slå upp adressen för din position. Försök igen."
    default:
      return "Adressen för din position kunde inte slås upp. Försök igen eller ange adressen manuellt."
  }
}

function describeRequestLocationFailure(error: unknown): string {
  if (error instanceof GeolocationRequestError) return describeGeolocationError(error)
  if (error instanceof GeocodeRequestError) return describeGeocodeError(error)
  return "Adressen för din position kunde inte slås upp. Försök igen eller ange adressen manuellt."
}

/**
 * Owns address entry: manual confirmation and device-position lookup, with one Swedish
 * message per failure mode (denied permission, timeout, unsupported browser, failed geocode
 * lookup, and no resolvable address). Exposes UI-ready state rather than raw transport details.
 *
 * A failed location request never clears a previously confirmed address; manual entry stays
 * available regardless of the error. A `pending` guard discards a second concurrent request.
 */
export function useAddress() {
  const [state, setState] = useState<AddressState>({
    address: null,
    status: "idle",
    errorMessage: "",
  })
  const mounted = useRef(false)
  const pending = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /**
   * Confirms a manually typed address.
   *
   * Only trims and stores the text as-is: it is never sent to the backend, never validated
   * against a real place and never given coordinates. Unlike `requestLocation`, this is a
   * synchronous, purely local update — it has no network/geocoding step to fail. A blank or
   * whitespace-only address is silently ignored rather than confirmed.
   */
  const submitManualAddress = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setState({
      address: { text: trimmed, source: "manual", approximate: false },
      status: "success",
      errorMessage: "",
    })
  }, [])

  const requestLocation = useCallback(() => {
    if (pending.current) return
    pending.current = true
    setState((previous) => ({ ...previous, status: "resolving", errorMessage: "" }))

    let accuracy: number | undefined

    void requestCurrentPosition()
      .then((coordinates) => {
        accuracy = coordinates.accuracy
        return fetchGeocode(coordinates.lat, coordinates.lon)
      })
      .then((result) => {
        if (!mounted.current) return
        if (!result.found) {
          setState((previous) => ({ ...previous, status: "error", errorMessage: result.message }))
          return
        }
        setState({
          address: {
            text: result.address,
            source: "geolocated",
            approximate: true,
            lat: result.lat,
            lon: result.lon,
            municipality: result.municipality ?? undefined,
            accuracy,
          },
          status: "success",
          errorMessage: "",
        })
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage: describeRequestLocationFailure(error),
        }))
      })
      .finally(() => {
        pending.current = false
      })
  }, [])

  return {
    address: state.address,
    loading: state.status === "resolving",
    failed: state.status === "error",
    errorMessage: state.errorMessage,
    submitManualAddress,
    requestLocation,
  }
}
