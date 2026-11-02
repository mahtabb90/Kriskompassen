import type { CrisisKitCategory } from "../types/crisisKit"

/** Names of the decorative icons available for crisis articles and emergency-kit categories. */
export type CrisisIconName =
  | "food"
  | "water"
  | "hygiene"
  | "heat"
  | "communication"
  | "medicine"
  | "payment"
  | "pets"
  | "other"

const ARTICLE_ICONS: Record<string, CrisisIconName> = {
  "food-in-crisis": "food",
  "drinking-water-in-crisis": "water",
  "hygiene-in-crisis": "hygiene",
  "heating-in-crisis": "heat",
  "communication-in-crisis": "communication",
  "medication-in-crisis": "medicine",
}

// Typed as a full record so a new category cannot be added without choosing an icon.
const KIT_CATEGORY_ICONS: Record<CrisisKitCategory, CrisisIconName> = {
  Mat: "food",
  Dricksvatten: "water",
  "Toalett och hygien": "hygiene",
  Värme: "heat",
  Kommunikation: "communication",
  Läkemedel: "medicine",
  Betalningar: "payment",
  Husdjur: "pets",
  Övrigt: "other",
}

/**
 * Chooses the icon for a crisis information article.
 *
 * @param id The article ID.
 * @returns The matching icon, or the generic icon for unknown or future articles.
 */
export function iconForArticleId(id: string): CrisisIconName {
  return Object.hasOwn(ARTICLE_ICONS, id) ? ARTICLE_ICONS[id] : "other"
}

/**
 * Chooses the icon for an emergency-kit category.
 *
 * @param category The emergency-kit category.
 * @returns The icon for that category.
 */
export function iconForKitCategory(category: CrisisKitCategory): CrisisIconName {
  return KIT_CATEGORY_ICONS[category]
}
