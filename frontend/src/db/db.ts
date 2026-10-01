import Dexie, { type Table } from "dexie"
import type { CrisisItem } from "../types/crisis"

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
