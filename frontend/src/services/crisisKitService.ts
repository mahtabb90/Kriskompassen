import { RECOMMENDED_CRISIS_KIT } from "../data/recommendedCrisisKit"
import { db } from "../db/db"
import {
  CRISIS_KIT_CATEGORIES,
  type CrisisKitCategory,
  type CrisisKitItem,
} from "../types/crisisKit"

function validateName(name: string): string {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error("Namnet får inte vara tomt.")
  }

  return trimmedName
}

function validateExpirationDate(date: string | undefined): string | undefined {
  if (date === undefined || date === "") {
    return undefined
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)

  if (!match) {
    throw new Error("Ange ett giltigt datum.")
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsedDate = new Date(Date.UTC(year, month - 1, day))

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error("Ange ett giltigt datum.")
  }

  return date
}

function validateCategory(category: CrisisKitCategory): void {
  if (!(CRISIS_KIT_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error("Välj en giltig kategori.")
  }
}

/**
 * Loads the emergency-kit checklist from IndexedDB.
 *
 * Recommended items remain visible even when the user has saved changes.
 * User-created items are included alongside the recommendations.
 */
export async function getCrisisKitItems(): Promise<CrisisKitItem[]> {
  const savedItems = await db.crisisKitItems.toArray()
  const savedItemsById = new Map(savedItems.map((item) => [item.id, item]))

  const recommendedItems = RECOMMENDED_CRISIS_KIT.map((item) => {
    const savedItem = savedItemsById.get(item.id)

    if (!savedItem) {
      return { ...item, isOwned: false }
    }

    return {
      ...item,
      isOwned: savedItem.isOwned,
      expirationDate: savedItem.expirationDate,
    }
  })

  const customItems = savedItems.filter((item) => item.isCustom)

  return [...recommendedItems, ...customItems]
}

interface CrisisKitItemUpdate {
  isOwned?: boolean
  expirationDate?: string | null
}

/**
 * Updates ownership and expiration date for a recommended item.
 */
export async function updateCrisisKitItem(id: string, updates: CrisisKitItemUpdate): Promise<void> {
  const recommendedItem = RECOMMENDED_CRISIS_KIT.find((item) => item.id === id)

  if (!recommendedItem) {
    throw new Error("Det gick inte att hitta den rekommenderade saken.")
  }

  if (updates.isOwned === undefined && updates.expirationDate === undefined) {
    throw new Error("Ingen ändring att spara.")
  }

  const expirationDate =
    updates.expirationDate === null ? undefined : validateExpirationDate(updates.expirationDate)

  const savedItem = await db.crisisKitItems.get(id)

  const updatedItem: CrisisKitItem = {
    ...recommendedItem,
    isOwned: savedItem?.isOwned ?? false,
    ...(updates.isOwned !== undefined ? { isOwned: updates.isOwned } : {}),
  }

  if (updates.expirationDate !== undefined) {
    if (expirationDate) {
      updatedItem.expirationDate = expirationDate
    } else {
      delete updatedItem.expirationDate
    }
  }

  await db.crisisKitItems.put(updatedItem)
}

/**
 * Updates ownership for an existing custom emergency-kit item.
 */
export async function updateCustomCrisisKitItemOwnership(
  id: string,
  isOwned: boolean
): Promise<void> {
  const savedItem = await db.crisisKitItems.get(id)

  if (!savedItem?.isCustom) {
    throw new Error("Det gick inte att hitta den egna saken.")
  }

  await db.crisisKitItems.put({
    ...savedItem,
    isOwned,
  })
}

/**
 * Creates a custom emergency-kit item in IndexedDB.
 */
export async function addCustomCrisisKitItem(
  name: string,
  category: CrisisKitCategory
): Promise<CrisisKitItem> {
  const item: CrisisKitItem = {
    id: crypto.randomUUID(),
    name: validateName(name),
    category,
    isOwned: false,
    isCustom: true,
  }

  validateCategory(category)

  await db.crisisKitItems.add(item)
  return item
}

/**
 * Updates an existing custom item's name, category, and optional expiration date.
 */
export async function updateCustomCrisisKitItem(
  id: string,
  name: string,
  category: CrisisKitCategory,
  expirationDate?: string | null
): Promise<void> {
  const validatedName = validateName(name)
  validateCategory(category)

  const savedItem = await db.crisisKitItems.get(id)

  if (!savedItem?.isCustom) {
    throw new Error("Det gick inte att hitta den egna saken.")
  }

  const updatedItem: CrisisKitItem = {
    ...savedItem,
    name: validatedName,
    category,
  }

  if (expirationDate !== undefined) {
    const validatedDate =
      expirationDate === null ? undefined : validateExpirationDate(expirationDate)

    if (validatedDate) {
      updatedItem.expirationDate = validatedDate
    } else {
      delete updatedItem.expirationDate
    }
  }

  await db.crisisKitItems.put(updatedItem)
}

/**
 * Deletes a custom item without allowing recommended items to be removed.
 */
export async function deleteCustomCrisisKitItem(id: string): Promise<void> {
  const savedItem = await db.crisisKitItems.get(id)

  if (!savedItem?.isCustom) {
    throw new Error("Det gick inte att hitta den egna saken.")
  }

  await db.crisisKitItems.delete(id)
}

/**
 * Returns the default emergency-kit recommendations without accessing storage.
 */
export function getRecommendedCrisisKitItems(): CrisisKitItem[] {
  return RECOMMENDED_CRISIS_KIT.map((item) => ({
    ...item,
    isOwned: false,
  }))
}
