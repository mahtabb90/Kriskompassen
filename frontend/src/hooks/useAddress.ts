import { useCallback, useEffect, useRef, useState } from "react"
import {
  GeocodeRequestError,
  fetchAddressCandidates,
  fetchGeocode,
} from "../services/geocodingService"
import { GeolocationRequestError, requestCurrentPosition } from "../services/geolocationService"
import type { Address, GeocodeCandidate } from "../types/address"

type ResolvingSource = "manual" | "geolocated" | "coordinates"

interface AddressState {
  address: Address | null
  status: "idle" | "resolving" | "choosing" | "success" | "error"
  resolvingSource: ResolvingSource | null
  candidates: GeocodeCandidate[]
  errorMessage: string
}

const NO_ADDRESS_MATCH_MESSAGE =
  "Ingen adress hittades. Kontrollera stavningen eller ange en mer specifik adress."

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

function describeGeocodeError(error: GeocodeRequestError, context: string): string {
  switch (error.code) {
    case "timeout":
      return `Det tog för lång tid att slå upp adressen för ${context}. Försök igen.`
    default:
      return `Adressen för ${context} kunde inte slås upp. Försök igen eller ange adressen manuellt.`
  }
}

function describeRequestLocationFailure(error: unknown): string {
  if (error instanceof GeolocationRequestError) return describeGeolocationError(error)
  if (error instanceof GeocodeRequestError) return describeGeocodeError(error, "din position")
  return "Adressen för din position kunde inte slås upp. Försök igen eller ange adressen manuellt."
}

function describeCoordinateLookupFailure(error: unknown): string {
  if (error instanceof GeocodeRequestError) {
    return describeGeocodeError(error, "de angivna koordinaterna")
  }
  return "Adressen för de angivna koordinaterna kunde inte slås upp. Försök igen eller ange adressen manuellt."
}

function describeSearchFailure(error: unknown): string {
  if (error instanceof GeocodeRequestError && error.code === "timeout") {
    return "Det tog för lång tid att söka efter adressen. Försök igen."
  }
  return "Det gick inte att söka efter adressen. Försök igen eller kontrollera din anslutning."
}

/**
 * Converts one search candidate into a resolved address.
 *
 * approximate stays false: unlike a device or pasted-coordinate fix, the remaining uncertainty
 * here was "which of several matches did the user mean," not "how precise is this coordinate" -
 * once chosen (or unique to begin with), the match is exact, not an estimate.
 */
function candidateToAddress(candidate: GeocodeCandidate): Address {
  return {
    text: candidate.address,
    source: "manual",
    approximate: false,
    lat: candidate.lat,
    lon: candidate.lon,
    municipality: candidate.municipality ?? undefined,
  }
}

/**
 * Owns address entry: manual confirmation, device-position lookup and typed/pasted-coordinate
 * lookup, with one Swedish message per failure mode (denied permission, timeout, unsupported
 * browser, failed geocode lookup, no resolvable address, and no address-search match). Exposes
 * UI-ready state rather than raw transport details.
 *
 * A manually typed address is forward-geocoded through the backend: a unique match resolves
 * immediately, no match reports an error, and more than one match moves to a "choosing" state
 * exposing `candidates` for the caller to let the user pick from (via `selectCandidate`) - e.g.
 * "Storgatan 1" exists in several municipalities. A typed/pasted coordinate pair instead skips
 * straight to reverse geocoding it, exactly like a fetched device position, via
 * `submitCoordinates` - the caller (AddressSection) is responsible for recognizing coordinate
 * text and routing it there instead of `submitManualAddress`. A failed location, coordinate or
 * search request never clears a previously confirmed address. A single `pending` guard discards
 * a second concurrent request from any of the three paths, since they all end in the same state
 * machine.
 */
export function useAddress() {
  const [state, setState] = useState<AddressState>({
    address: null,
    status: "idle",
    resolvingSource: null,
    candidates: [],
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
   * Resolves a manually typed address through the backend's forward-geocode search.
   *
   * A blank or whitespace-only address is silently ignored. Zero matches is reported as an
   * error; exactly one match resolves immediately; more than one moves to a "choosing" state
   * for `selectCandidate` to finish.
   */
  const submitManualAddress = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || pending.current) return
    pending.current = true
    setState((previous) => ({
      ...previous,
      status: "resolving",
      resolvingSource: "manual",
      candidates: [],
      errorMessage: "",
    }))

    void fetchAddressCandidates(trimmed)
      .then((candidates) => {
        if (!mounted.current) return
        if (candidates.length === 0) {
          setState((previous) => ({
            ...previous,
            status: "error",
            resolvingSource: null,
            errorMessage: NO_ADDRESS_MATCH_MESSAGE,
          }))
          return
        }
        if (candidates.length === 1) {
          setState({
            address: candidateToAddress(candidates[0]),
            status: "success",
            resolvingSource: null,
            candidates: [],
            errorMessage: "",
          })
          return
        }
        setState((previous) => ({
          ...previous,
          status: "choosing",
          resolvingSource: null,
          candidates,
        }))
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        setState((previous) => ({
          ...previous,
          status: "error",
          resolvingSource: null,
          errorMessage: describeSearchFailure(error),
        }))
      })
      .finally(() => {
        pending.current = false
      })
  }, [])

  /** Finishes a "choosing" selection: resolves the address to the chosen candidate. */
  const selectCandidate = useCallback((candidate: GeocodeCandidate) => {
    setState({
      address: candidateToAddress(candidate),
      status: "success",
      resolvingSource: null,
      candidates: [],
      errorMessage: "",
    })
  }, [])

  const requestLocation = useCallback(() => {
    if (pending.current) return
    pending.current = true
    setState((previous) => ({
      ...previous,
      status: "resolving",
      resolvingSource: "geolocated",
      candidates: [],
      errorMessage: "",
    }))

    let accuracy: number | undefined

    void requestCurrentPosition()
      .then((coordinates) => {
        accuracy = coordinates.accuracy
        return fetchGeocode(coordinates.lat, coordinates.lon)
      })
      .then((result) => {
        if (!mounted.current) return
        if (!result.found) {
          setState((previous) => ({
            ...previous,
            status: "error",
            resolvingSource: null,
            errorMessage: result.message,
          }))
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
          resolvingSource: null,
          candidates: [],
          errorMessage: "",
        })
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        setState((previous) => ({
          ...previous,
          status: "error",
          resolvingSource: null,
          errorMessage: describeRequestLocationFailure(error),
        }))
      })
      .finally(() => {
        pending.current = false
      })
  }, [])

  /**
   * Resolves a coordinate pair the user typed or pasted into the address field.
   *
   * Mirrors `requestLocation`'s geocoding step exactly, skipping only the device-position
   * fetch: the given lat/lon is sent straight to the backend's reverse geocoding. The caller
   * is expected to have already validated the pair is within range; this function does not
   * re-check it. The resulting address has no `accuracy`, since there is no device fix.
   */
  const submitCoordinates = useCallback((lat: number, lon: number) => {
    if (pending.current) return
    pending.current = true
    setState((previous) => ({
      ...previous,
      status: "resolving",
      resolvingSource: "coordinates",
      candidates: [],
      errorMessage: "",
    }))

    void fetchGeocode(lat, lon)
      .then((result) => {
        if (!mounted.current) return
        if (!result.found) {
          setState((previous) => ({
            ...previous,
            status: "error",
            resolvingSource: null,
            errorMessage: result.message,
          }))
          return
        }
        setState({
          address: {
            text: result.address,
            source: "coordinates",
            approximate: true,
            lat: result.lat,
            lon: result.lon,
            municipality: result.municipality ?? undefined,
          },
          status: "success",
          resolvingSource: null,
          candidates: [],
          errorMessage: "",
        })
      })
      .catch((error: unknown) => {
        if (!mounted.current) return
        setState((previous) => ({
          ...previous,
          status: "error",
          resolvingSource: null,
          errorMessage: describeCoordinateLookupFailure(error),
        }))
      })
      .finally(() => {
        pending.current = false
      })
  }, [])

  return {
    address: state.address,
    loading: state.status === "resolving",
    /** Which action is currently resolving, so the UI can label the right control. */
    resolvingSource: state.resolvingSource,
    /** True while awaiting a pick among several address-search matches. */
    choosing: state.status === "choosing",
    candidates: state.candidates,
    failed: state.status === "error",
    errorMessage: state.errorMessage,
    submitManualAddress,
    selectCandidate,
    requestLocation,
    submitCoordinates,
  }
}
