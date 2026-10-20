const COORDINATE_PATTERN = /^\s*(-?\d{1,3}(?:\.\d+)?)[\s,]+(-?\d{1,3}(?:\.\d+)?)\s*$/

/**
 * Parses text as a latitude/longitude pair in decimal degrees, separated by a comma and/or
 * whitespace, e.g. "59.3293, 18.0686" or "59.3293 18.0686".
 *
 * Returns the parsed numbers regardless of whether they fall within a valid range — callers
 * check that separately with `isValidLatLon`. Returns null for text that is not shaped like a
 * coordinate pair, which should be treated as a normal address instead.
 */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const match = COORDINATE_PATTERN.exec(text)
  if (!match) return null
  return { lat: Number(match[1]), lon: Number(match[2]) }
}

/** Matches the latitude/longitude ranges the backend's reverse-geocoding endpoint accepts. */
export function isValidLatLon(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}
