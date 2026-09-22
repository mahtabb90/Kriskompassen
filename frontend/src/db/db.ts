import Dexie, { type Table } from "dexie"

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

class KrisKompassenDatabase extends Dexie {
  crisisItems!: Table<CrisisItem, string>

  constructor() {
    super("KrisKompassenDB")

    this.version(1).stores({
      crisisItems: "id, title, source, fetchedAt, savedOffline",
    })
  }
}

export const db = new KrisKompassenDatabase()