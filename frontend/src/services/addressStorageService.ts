import { db } from "../db/db"
import type { Address, AddressLabel, SavedAddress } from "../types/address"

/**
 * Saves a new address, labelling it and activating it if it is the first one saved.
 *
 * @param address The resolved address text/source/coordinates to save.
 * @param label How to categorize the saved address.
 * @returns The stored record, including its generated id and save time.
 */
export async function saveAddress(address: Address, label: AddressLabel): Promise<SavedAddress> {
  const existing = await db.savedAddresses.count()
  const record: SavedAddress = {
    ...address,
    id: crypto.randomUUID(),
    label,
    isActive: existing === 0,
    savedAt: new Date().toISOString(),
  }
  await db.savedAddresses.put(record)
  return record
}

/**
 * Returns all saved addresses.
 *
 * @returns Saved addresses in no particular order, or an empty array if none are saved.
 */
export async function getSavedAddresses(): Promise<SavedAddress[]> {
  return db.savedAddresses.toArray()
}

/**
 * Makes one saved address the active one, deactivating every other saved address.
 *
 * @param id ID of the address to activate.
 * @throws If no saved address has this id.
 */
export async function setActiveAddress(id: string): Promise<void> {
  await db.transaction("rw", db.savedAddresses, async () => {
    const target = await db.savedAddresses.get(id)
    if (!target) throw new Error(`No saved address with id ${id}.`)

    const all = await db.savedAddresses.toArray()
    await Promise.all(
      all
        .filter((item) => item.isActive !== (item.id === id))
        .map((item) => db.savedAddresses.put({ ...item, isActive: item.id === id }))
    )
  })
}

/**
 * Removes a saved address.
 *
 * If the removed address was active, the first remaining saved address (if any) becomes
 * active, so there is never more than one active address but one exists whenever possible.
 *
 * @param id ID of the address to remove.
 */
export async function removeAddress(id: string): Promise<void> {
  await db.transaction("rw", db.savedAddresses, async () => {
    const removed = await db.savedAddresses.get(id)
    await db.savedAddresses.delete(id)

    if (removed?.isActive) {
      const [nextActive] = await db.savedAddresses.toArray()
      if (nextActive) {
        await db.savedAddresses.put({ ...nextActive, isActive: true })
      }
    }
  })
}
