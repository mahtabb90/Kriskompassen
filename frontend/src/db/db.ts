import Dexie, { type Table } from "dexie"
import type { CrisisItem } from "../types/crisis"
import type { CrisisKitItem } from "../types/crisisKit"

/**
 * Dexie wrapper for the app's local database.
 *
 * Defines the IndexedDB schema used to store crisis information and
 * emergency-kit items for offline access.
 */
class KrisKompassenDatabase extends Dexie {
  crisisItems!: Table<CrisisItem, string>
  crisisKitItems!: Table<CrisisKitItem, string>

  constructor() {
    super("KrisKompassenDB")

    this.version(1).stores({
      crisisItems: "id, title, source, fetchedAt, savedOffline",
    })

    this.version(2).stores({
      crisisItems: "id, title, source, fetchedAt, savedOffline",
      crisisKitItems: "id, category, isOwned, isCustom",
    })
  }
}

/** Shared database instance used throughout the app to read and write local data. */
export const db = new KrisKompassenDatabase()
