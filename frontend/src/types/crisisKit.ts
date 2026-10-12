/**
 * Categories used to group items in the user's emergency kit.
 * Based on the Swedish Civil Contingencies Agency's home preparedness guidance
 * published on Krisinformation.se.
 */
export const CRISIS_KIT_CATEGORIES = [
  "Mat",
  "Dricksvatten",
  "Toalett och hygien",
  "Värme",
  "Kommunikation",
  "Läkemedel",
  "Betalningar",
  "Husdjur",
  "Övrigt",
] as const

/**
 * A category that can be assigned to an emergency-kit item.
 */
export type CrisisKitCategory = (typeof CRISIS_KIT_CATEGORIES)[number]

/**
 * Represents an item in the user's emergency kit.
 *
 * Recommended items come from an official source.
 * Custom items are added by the user.
 * Ownership status is independent of item origin:
 * `isCustom` identifies user-created items, while `isOwned`
 * indicates whether the user has confirmed they own the item.
 *
 * @property id Unique identifier for the item.
 * @property name Display name of the item.
 * @property category Category used to group items in the checklist.
 * @property isOwned Whether the user has confirmed they own the item.
 * @property expirationDate Optional expiration date in YYYY-MM-DD format.
 * @property isCustom Whether the item was added by the user.
 */
export interface CrisisKitItem {
  id: string
  name: string
  category: CrisisKitCategory
  subcategory?: string
  isOwned: boolean
  expirationDate?: string
  isCustom: boolean
}
