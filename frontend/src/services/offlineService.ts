import { db } from "../db/db"
import type { CrisisItem } from "../types/crisis"

/**
 * Marks a crisis item as saved for offline access and writes it to IndexedDB.
 *
 * Overwrites any existing item with the same id, regardless of its previous `savedOffline` value.
 *
 * @param item Crisis item to persist locally.
 */
export async function saveOffline(item: CrisisItem) {
  await db.crisisItems.put({
    ...item,
    savedOffline: true,
  })
}

/**
 * Removes a crisis item from local storage.
 *
 * @param id ID of the item to remove.
 */
export async function removeOffline(id: string) {
  await db.crisisItems.delete(id)
}

/**
 * Returns all crisis items currently saved for offline access.
 *
 * @returns Items with `savedOffline` set to true, or an empty array if none are saved.
 */
export async function getOfflineItems() {
  return db.crisisItems.filter((item) => item.savedOffline).toArray()
}

/**
 * Returns one crisis item that is saved for offline access.
 *
 * @param id ID of the item to read.
 * @returns The stored item, or undefined if it does not exist locally or its `savedOffline`
 * value is not true.
 * @throws If IndexedDB cannot be read.
 */
export async function getOfflineItem(id: string) {
  const item = await db.crisisItems.get(id)

  return item?.savedOffline === true ? item : undefined
}

/**
 * Checks whether a crisis item is saved for offline access.
 *
 * @param id ID of the item to check.
 * @returns True if the item exists locally and is marked as saved offline, false otherwise.
 */
export async function isSavedOffline(id: string) {
  const item = await db.crisisItems.get(id)

  return item?.savedOffline ?? false
}
