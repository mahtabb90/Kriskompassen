/**
 * Represents crisis information displayed in the app and optionally cached for offline access.
 *
 * @property id Provides a stable identifier used as the IndexedDB primary key.
 * @property sourceUrl Links to the original source; omitted when no public source page exists.
 * @property fetchedAt Records retrieval or generation time in ISO 8601 UTC format
 * (`YYYY-MM-DDTHH:mm:ss.sssZ`), as returned by `Date.prototype.toISOString()`.
 * @property savedOffline Indicates whether the user has chosen to keep the item available offline.
 * @property savedAt Records when the item was saved for offline access in ISO 8601 UTC format
 * (YYYY-MM-DDTHH:mm:ss.sssZ), or is omitted when no save timestamp is available.
 */
export interface CrisisItem {
  id: string
  title: string
  description: string
  content: string
  source: string
  sourceUrl?: string
  fetchedAt: string
  savedOffline: boolean
  savedAt?: string
}
