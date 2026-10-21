import { db } from "../db/db"
import type { Shelter } from "../types/shelter"

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
