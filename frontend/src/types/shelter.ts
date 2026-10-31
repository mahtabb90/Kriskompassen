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

/** Reports every shelter from the local snapshot inside one map viewport. */
export interface ShelterBoundsResponse {
  shelters: Shelter[]
  source: ShelterSource
}

/**
 * Extends a shelter with when it was cached locally, for offline reuse.
 *
 * @property fetchedAt Records the local cache time in ISO 8601 UTC.
 */
export interface CachedShelter extends Shelter {
  fetchedAt: string
}

/**
 * A shelter the user has deliberately bookmarked, stored only on this device (AGENTS.md §9).
 *
 * Holds only the id plus an address/coordinate fallback, not the full shelter - the rest (type,
 * capacity, number) is re-derived from the shelter cache when available. The fallback keeps the
 * bookmark showing a usable address and distance even if the shelter has since dropped out of
 * that cache, e.g. on a device that never re-searched its area.
 *
 * @property comment A short (50-character max), user-authored note to help relocate the shelter
 * (e.g. "Kommunhuset"), since MCF's address field is often not enough on its own. null when unset.
 */
export interface SavedShelter {
  id: string
  address: string | null
  lat: number
  lon: number
  savedAt: string
  comment: string | null
}
