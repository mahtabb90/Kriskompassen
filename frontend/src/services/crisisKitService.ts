import { RECOMMENDED_CRISIS_KIT } from "../data/recommendedCrisisKit"
import { db } from "../db/db"
import type { CrisisKitItem } from "../types/crisisKit"

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

/**
 * Returns the default emergency-kit recommendations without accessing storage.
 */
export function getRecommendedCrisisKitItems(): CrisisKitItem[] {
  return RECOMMENDED_CRISIS_KIT.map((item) => ({
    ...item,
    isOwned: false,
  }))
}
