import { describe, expect, it } from "vitest"
import { CRISIS_KIT_CATEGORIES } from "../types/crisisKit"
import { iconForArticleId, iconForKitCategory } from "./crisisIcons"

describe("iconForArticleId", () => {
  it("maps every curated article", () => {
    expect(iconForArticleId("food-in-crisis")).toBe("food")
    expect(iconForArticleId("drinking-water-in-crisis")).toBe("water")
    expect(iconForArticleId("hygiene-in-crisis")).toBe("hygiene")
    expect(iconForArticleId("heating-in-crisis")).toBe("heat")
    expect(iconForArticleId("communication-in-crisis")).toBe("communication")
    expect(iconForArticleId("medication-in-crisis")).toBe("medicine")
  })

  it("falls back to the generic icon for unknown IDs, including inherited property names", () => {
    expect(iconForArticleId("future-article")).toBe("other")
    expect(iconForArticleId("toString")).toBe("other")
  })
})

describe("iconForKitCategory", () => {
  it("maps every category", () => {
    expect(CRISIS_KIT_CATEGORIES.map(iconForKitCategory)).toEqual([
      "food",
      "water",
      "hygiene",
      "heat",
      "communication",
      "medicine",
      "payment",
      "pets",
      "other",
    ])
  })

  it("reuses the article icon for the same concept", () => {
    expect(iconForKitCategory("Mat")).toBe(iconForArticleId("food-in-crisis"))
    expect(iconForKitCategory("Värme")).toBe(iconForArticleId("heating-in-crisis"))
  })
})
