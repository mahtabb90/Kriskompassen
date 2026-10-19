/**
 * Represents an article supplied by the backend, without device-local saving state.
 *
 * @property id Provides a stable URL-safe identifier, also used as the IndexedDB primary key.
 * @property sourceUrl Links to the original source; omitted when no public source page exists.
 * @property fetchedAt Records the original compilation time in ISO 8601 UTC format
 * (`YYYY-MM-DDTHH:mm:ss.sssZ`). Fetching the article does not change this timestamp.
 */
export interface CrisisArticle {
  id: string
  title: string
  description: string
  content: string
  source: string
  sourceUrl?: string
  fetchedAt: string
}

/**
 * Extends article content with device-local offline metadata, retaining the existing DB shape.
 *
 * @property savedOffline Indicates the user's local saving choice; never read from the API.
 * @property savedAt Records the local save time in ISO 8601 UTC, or is absent on older copies.
 */
export interface CrisisItem extends CrisisArticle {
  savedOffline: boolean
  savedAt?: string
}
