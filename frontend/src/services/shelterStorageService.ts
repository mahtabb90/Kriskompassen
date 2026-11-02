import { db } from "../db/db"
import type { CachedShelter, SavedShelter, Shelter } from "../types/shelter"

/**
 * Writes freshly fetched shelters into IndexedDB, tagging each with when it was cached.
 *
 * Overwrites any existing copy with the same id, so a corrected upstream record eventually
 * replaces a stale offline copy the next time it is fetched. This is the local store that
 * grows over time as the user searches different areas - unlike a server-side file, it
 * survives across sessions since it lives in the browser, not a stateless backend instance.
 */
export async function cacheShelters(shelters: Shelter[]): Promise<void> {
  if (shelters.length === 0) return
  const fetchedAt = new Date().toISOString()
  await db.shelterCache.bulkPut(shelters.map((shelter) => ({ ...shelter, fetchedAt })))
}

/**
 * Returns every shelter cached so far, from any previously searched area.
 *
 * The cache only ever holds what earlier online lookups actually fetched - bounded by how many
 * distinct areas the user has searched - so reading it all and letting the caller rank by
 * distance needs no further indexing.
 */
export async function getAllCachedShelters(): Promise<Shelter[]> {
  return db.shelterCache.toArray()
}

/**
 * Returns one cached shelter by id, or undefined if it has never been cached locally.
 *
 * Backs the shelter detail view, which has no single-shelter backend endpoint to fall back on -
 * online or offline, it always reads whatever an earlier nearest-shelters lookup wrote through.
 */
export async function getCachedShelterById(id: string): Promise<CachedShelter | undefined> {
  return db.shelterCache.get(id)
}

/**
 * Bookmarks a shelter for quick access later, keyed by its id (AGENTS.md §9).
 *
 * Stores only the address and coordinates as a fallback, not the full shelter - overwrites any
 * existing bookmark for the same id, refreshing its fallback fields and savedAt.
 */
export async function saveShelter(
  shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">
): Promise<void> {
  const saved: SavedShelter = {
    id: shelter.id,
    address: shelter.address,
    lat: shelter.lat,
    lon: shelter.lon,
    savedAt: new Date().toISOString(),
    comment: null,
  }
  await db.savedShelters.put(saved)
}

/** Removes a bookmarked shelter. Removing one that was never saved is a no-op. */
export async function removeSavedShelter(id: string): Promise<void> {
  await db.savedShelters.delete(id)
}

/** Returns every shelter the user has bookmarked on this device. */
export async function getSavedShelters(): Promise<SavedShelter[]> {
  return db.savedShelters.toArray()
}

/**
 * Sets a bookmarked shelter's relocation comment (AGENTS.md §9), trimmed to 50 characters.
 *
 * A blank comment (after trimming) clears it back to null rather than storing an empty string.
 * Updating a shelter that was never saved is a no-op - there is no record to attach the comment
 * to.
 */
export async function setSavedShelterComment(id: string, comment: string): Promise<void> {
  const trimmed = comment.trim().slice(0, 50)
  await db.savedShelters.update(id, { comment: trimmed.length > 0 ? trimmed : null })
}
