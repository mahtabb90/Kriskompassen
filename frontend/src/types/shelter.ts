/**
 * Represents one civil-defense shelter returned by the backend's MCF-backed shelter lookup.
 *
 * @property number The shelter's official number (MCF's "name", e.g. "120599-3"), matching the
 * number physically posted at its entrance. The only reliable way to tell apart two separate
 * shelters that share the same address, and sometimes even the same coordinates and capacity -
 * MCF genuinely registers several shelters under one shared property.
 * @property address MCF's free-text location description (e.g. a building name) - not a
 * verified postal address, since MCF's source data has none.
 * @property type MCF's status type (e.g. "Skyddsrum"), not an availability status.
 */
export interface Shelter {
  id: string
  number: string | null
  address: string | null
  lat: number
  lon: number
  capacity: number | null
  type: string | null
}

/** Identifies where the shelter data came from and its open-data terms. */
export interface ShelterSource {
  name: string
  url: string
  apiName: string
  apiUrl: string
}

/** Reports the nearest shelters found within the search radius actually used. */
export interface ShelterListResponse {
  shelters: Shelter[]
  source: ShelterSource
  bboxRadiusMetersUsed: number
}

/**
 * Extends a shelter with when it was cached locally, for offline reuse.
 *
 * @property fetchedAt Records the local cache time in ISO 8601 UTC.
 */
export interface CachedShelter extends Shelter {
  fetchedAt: string
}
