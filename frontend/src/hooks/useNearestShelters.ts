import { useCallback } from "react"
import { useMode } from "../context/modeContext"
import { fetchNearestShelters } from "../services/shelterService"
import { cacheShelters, getAllCachedShelters } from "../services/shelterStorageService"
import type { Shelter } from "../types/shelter"
import { nearestN, type GeoPoint } from "../utils/distance"
import { useCrisisResource } from "./useCrisisResource"

/** Matches the ticket's "e.g. 5 nearest" guidance. */
export const NEAREST_SHELTER_COUNT = 5

export type NearestShelter = Shelter & { distanceMeters: number }

/**
 * Loads and ranks the nearest shelters to one position, online or from the local cache.
 *
 * Online, fetches fresh shelters for the position, writes them through to IndexedDB so they
 * remain available offline later, then ranks them by distance. Offline, ranks whatever has
 * already been cached from earlier online lookups, making no network call. A changed position
 * or online/offline mode starts a fresh attempt, via useCrisisResource's existing key/loader
 * contract - this hook is not specific to crisis articles, only named after its first use.
 */
export function useNearestShelters(origin: GeoPoint) {
  const { mode } = useMode()

  const load = useCallback(
    async (signal: AbortSignal): Promise<NearestShelter[]> => {
      if (mode === "offline") {
        const cached = await getAllCachedShelters()
        return nearestN(origin, cached, NEAREST_SHELTER_COUNT)
      }
      const response = await fetchNearestShelters(origin.lat, origin.lon, signal)
      await cacheShelters(response.shelters)
      return nearestN(origin, response.shelters, NEAREST_SHELTER_COUNT)
    },
    // Depends on the coordinates, not the origin object's identity: a caller that passes a new
    // GeoPoint literal on every render (the common case, e.g. ShelterPage) must not re-trigger
    // this callback - and the fetch/cache-read it drives - unless the position actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, origin.lat, origin.lon]
  )

  const key = `${mode}:${origin.lat}:${origin.lon}`
  return useCrisisResource(key, load)
}
