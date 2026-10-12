/** Distinguishes an address the user typed from one derived from a device position. */
export type AddressSource = "manual" | "geolocated"

/**
 * Represents the address currently shown to the user.
 *
 * A geolocated address is always approximate: it comes from reverse-geocoding a device
 * position, not from the user confirming the exact text. A manual address is never
 * approximate; the user typed and confirmed it.
 */
export interface Address {
  text: string
  source: AddressSource
  approximate: boolean
  lat?: number
  lon?: number
}

/** Identifies why fetching a readable address from the backend failed. */
export type GeocodeRequestErrorCode = "network" | "http" | "timeout" | "invalid_json"

/** Identifies why the browser could not supply a device position. */
export type GeolocationErrorCode =
  "permission_denied" | "timeout" | "position_unavailable" | "unsupported"

/** Represents a position the backend could resolve to a readable address. */
export interface GeocodeFoundResult {
  found: true
  address: string
  municipality: string | null
  county: string | null
  lat: number
  lon: number
}

/** Represents a position the backend could not resolve; not a transport failure. */
export interface GeocodeNotFoundResult {
  found: false
  message: string
}

export type GeocodeResult = GeocodeFoundResult | GeocodeNotFoundResult
