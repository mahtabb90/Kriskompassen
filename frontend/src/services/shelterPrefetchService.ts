import type { GeoPoint } from "../utils/distance"
import { fetchNearestShelters } from "./shelterService"
import { cacheShelters } from "./shelterStorageService"

/**
 * Fetches and caches the shelters nearest one position in the background, best-effort.
 *
 * Intended to run right after a user saves an address, so its nearby shelters are already
 * available offline later - including if MCF's service becomes unreachable at that later
 * moment, which is exactly the failure this guards against. Never throws: skipped silently
 * while offline, and a failed fetch is swallowed rather than surfaced, since this must never
 * block or fail the address save it follows.
 */
export async function prefetchNearestShelters(origin: GeoPoint): Promise<void> {
  if (!navigator.onLine) return
  try {
    const response = await fetchNearestShelters(origin.lat, origin.lon)
    await cacheShelters(response.shelters)
  } catch {
    // Intentionally swallowed - see docstring. The caller's own save already succeeded.
  }
}
