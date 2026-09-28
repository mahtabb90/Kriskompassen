import Dexie, { type Table } from "dexie"

/**
 * A single piece of crisis information shown to the user and optionally
 * cached for offline access.
 *
 * @property id Stable identifier, used as the IndexedDB primary key.
 * @property sourceUrl Link to the original source. Omitted when the item has no public source page.
 * @property fetchedAt ISO 8601 timestamp of when the item was retrieved or generated.
 * @property savedOffline Whether the user has chosen to keep this item available without a network connection.
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
}

/**
 * Dexie wrapper for the app's local database.
 *
 * Defines the IndexedDB schema used to store crisis information for offline access.
 */
class KrisKompassenDatabase extends Dexie {
  crisisItems!: Table<CrisisItem, string>

  constructor() {
    super("KrisKompassenDB")

    this.version(1).stores({
      crisisItems: "id, title, source, fetchedAt, savedOffline",
    })
  }
}

/** Shared database instance used throughout the app to read and write crisis information. */
export const db = new KrisKompassenDatabase()