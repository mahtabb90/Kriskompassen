import type { GeoPoint } from "./distance"

/** Builds a link to OpenStreetMap centered on and marking one coordinate, zoomed to street level. */
export function buildOpenStreetMapUrl({ lat, lon }: GeoPoint): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`
}
