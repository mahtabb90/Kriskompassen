/** A WGS84 coordinate pair; shelters, saved addresses and device fixes all fit this shape. */
export interface GeoPoint {
  lat: number
  lon: number
}

const EARTH_RADIUS_METERS = 6_371_000

/** Great-circle distance between two WGS84 points, in meters. */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180
  const deltaLon = ((b.lon - a.lon) * Math.PI) / 180
  const sinHalfLat = Math.sin(deltaLat / 2)
  const sinHalfLon = Math.sin(deltaLon / 2)
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Sorts items by distance from origin and keeps the n nearest, each tagged with its distance.
 *
 * Ties keep their original relative order. Returns fewer than n items when the list is shorter.
 */
export function nearestN<T extends GeoPoint>(
  origin: GeoPoint,
  items: readonly T[],
  n: number
): (T & { distanceMeters: number })[] {
  return items
    .map((item) => ({ ...item, distanceMeters: haversineDistanceMeters(origin, item) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, Math.max(0, n))
}

/** Formats a distance in Swedish for display, e.g. "350 m" or "1,2 km". */
export function formatDistanceMeters(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`
}

/**
 * Formats a distance with its unit spelled out, e.g. "350 meter" or "1,2 kilometer".
 *
 * Pairs with formatDistanceMeters: the abbreviated form is for sighted users, this one for
 * screen readers, since assistive tech does not reliably expand "m"/"km" on its own.
 */
export function formatDistanceMetersForScreenReader(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} meter`
  return `${(distanceMeters / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} kilometer`
}
