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
  /** The municipality, when known from reverse geocoding. Not set for a manual address. */
  municipality?: string
  /** The browser's radius of uncertainty for the device fix behind this address, in meters. Not set for a manual address. */
  accuracy?: number
}

/**
 * Above this radius (in meters), a geolocated address is flagged as particularly imprecise
 * rather than just "approximate" — e.g. an IP/cell-based fallback fix with a multi-kilometer
 * error, as opposed to a typical Wi-Fi based fix.
 */
export const LOW_ACCURACY_THRESHOLD_METERS = 5_000

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

/**
 * Categorizes a saved address. "annan" carries a user-supplied label, e.g. "Sommarstuga";
 * "hem" and "arbete" are fixed categories with no additional text.
 */
export type AddressLabel = { kind: "hem" } | { kind: "arbete" } | { kind: "annan"; text: string }

/**
 * An address the user has saved for reuse, distinct from the address currently being composed.
 *
 * Exactly one saved address is active at a time (`isActive`): the one used as the starting
 * point for features like shelter search. Saving the first address activates it automatically;
 * activating another deactivates the rest.
 */
export interface SavedAddress extends Address {
  id: string
  label: AddressLabel
  isActive: boolean
  savedAt: string
}
