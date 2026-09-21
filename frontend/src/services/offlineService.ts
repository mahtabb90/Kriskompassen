import { db, type CrisisItem } from "../db/db"

export async function saveOffline(item: CrisisItem) {
  await db.crisisItems.put({
    ...item,
    savedOffline: true,
  })
}

export async function removeOffline(id: string) {
  await db.crisisItems.delete(id)
}

export async function getOfflineItems() {
  return db.crisisItems
    .filter(item => item.savedOffline)
    .toArray()
}

export async function isSavedOffline(id: string) {
  const item = await db.crisisItems.get(id)

  return item?.savedOffline ?? false
}