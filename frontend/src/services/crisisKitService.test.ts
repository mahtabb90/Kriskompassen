import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db/db", () => ({
  db: {
    crisisKitItems: {
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn(),
    },
  },
}))

import { db } from "../db/db"
import { RECOMMENDED_CRISIS_KIT } from "../data/recommendedCrisisKit"
import type { CrisisKitItem } from "../types/crisisKit"
import {
  addCustomCrisisKitItem,
  deleteCustomCrisisKitItem,
  getCrisisKitItems,
  getRecommendedCrisisKitItems,
  updateCrisisKitItem,
  updateCustomCrisisKitItem,
} from "./crisisKitService"

const table = db.crisisKitItems

const customItem: CrisisKitItem = {
  id: "custom-test-item",
  name: "Extra vatten",
  category: "Dricksvatten",
  isOwned: true,
  isCustom: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(table.toArray).mockResolvedValue([])
  vi.mocked(table.get).mockResolvedValue(undefined)
  vi.mocked(table.put).mockResolvedValue("test-item")
  vi.mocked(table.add).mockResolvedValue("test-item")
  vi.mocked(table.delete).mockResolvedValue(undefined)
})

describe("getCrisisKitItems", () => {
  it("shows recommendations as unowned when nothing is saved", async () => {
    const items = await getCrisisKitItems()

    expect(items).toHaveLength(RECOMMENDED_CRISIS_KIT.length)
    expect(items.every((item) => !item.isOwned)).toBe(true)
  })

  it("merges saved ownership and expiry dates into recommendations", async () => {
    vi.mocked(table.toArray).mockResolvedValue([
      {
        ...RECOMMENDED_CRISIS_KIT[0],
        isOwned: true,
        expirationDate: "2099-12-31",
      },
    ])

    const items = await getCrisisKitItems()
    const savedItem = items.find((item) => item.id === RECOMMENDED_CRISIS_KIT[0].id)

    expect(savedItem?.isOwned).toBe(true)
    expect(savedItem?.expirationDate).toBe("2099-12-31")
    expect(savedItem?.name).toBe(RECOMMENDED_CRISIS_KIT[0].name)
  })

  it("includes saved custom items", async () => {
    vi.mocked(table.toArray).mockResolvedValue([customItem])

    const items = await getCrisisKitItems()

    expect(items.find((item) => item.id === customItem.id)).toEqual(customItem)
  })

  it("propagates database read failures", async () => {
    vi.mocked(table.toArray).mockRejectedValue(new Error("Storage failed"))

    await expect(getCrisisKitItems()).rejects.toThrow("Storage failed")
  })
})

describe("getRecommendedCrisisKitItems", () => {
  it("returns recommendations without accessing IndexedDB", () => {
    const items = getRecommendedCrisisKitItems()

    expect(items).toHaveLength(RECOMMENDED_CRISIS_KIT.length)
    expect(items.every((item) => !item.isOwned)).toBe(true)
    expect(table.toArray).not.toHaveBeenCalled()
  })
})

describe("updateCrisisKitItem", () => {
  const recommendedItem = RECOMMENDED_CRISIS_KIT[0]

  it("saves ownership changes without replacing recommendation details", async () => {
    await updateCrisisKitItem(recommendedItem.id, { isOwned: true })

    expect(table.put).toHaveBeenCalledWith(
      expect.objectContaining({
        ...recommendedItem,
        isOwned: true,
      })
    )
  })

  it("saves a valid expiry date", async () => {
    await updateCrisisKitItem(recommendedItem.id, {
      expirationDate: "2099-12-31",
    })

    expect(table.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: recommendedItem.id,
        expirationDate: "2099-12-31",
      })
    )
  })

  it("rejects an invalid calendar date", async () => {
    await expect(
      updateCrisisKitItem(recommendedItem.id, {
        expirationDate: "2026-02-30",
      })
    ).rejects.toThrow("Ange ett giltigt datum.")

    expect(table.put).not.toHaveBeenCalled()
  })

  it("rejects malformed dates", async () => {
    await expect(
      updateCrisisKitItem(recommendedItem.id, {
        expirationDate: "not-a-date",
      })
    ).rejects.toThrow("Ange ett giltigt datum.")
  })

  it("rejects unknown recommendation IDs", async () => {
    await expect(updateCrisisKitItem("unknown-id", { isOwned: true })).rejects.toThrow(
      "Det gick inte att hitta den rekommenderade saken."
    )
  })

  it("propagates database write failures", async () => {
    vi.mocked(table.put).mockRejectedValue(new Error("Storage failed"))

    await expect(updateCrisisKitItem(recommendedItem.id, { isOwned: true })).rejects.toThrow(
      "Storage failed"
    )
  })

  it("removes an expiry date when passed null", async () => {
    vi.mocked(table.get).mockResolvedValue({
      ...recommendedItem,
      isOwned: true,
      expirationDate: "2028-05-20",
    })

    await updateCrisisKitItem(recommendedItem.id, { expirationDate: null })

    const savedItem = vi.mocked(table.put).mock.calls[0][0]

    expect(savedItem).not.toHaveProperty("expirationDate")
    expect(savedItem.isOwned).toBe(true)
  })

  it("preserves ownership when changing the expiry date", async () => {
    vi.mocked(table.get).mockResolvedValue({
      ...recommendedItem,
      isOwned: true,
      expirationDate: "2028-05-20",
    })

    await updateCrisisKitItem(recommendedItem.id, {
      expirationDate: "2029-05-20",
    })

    expect(table.put).toHaveBeenCalledWith(
      expect.objectContaining({
        isOwned: true,
        expirationDate: "2029-05-20",
      })
    )
  })

  it("rejects an empty update", async () => {
    await expect(updateCrisisKitItem(recommendedItem.id, {})).rejects.toThrow(
      "Ingen ändring att spara."
    )

    expect(table.put).not.toHaveBeenCalled()
  })
})

describe("addCustomCrisisKitItem", () => {
  it("trims and saves a custom item", async () => {
    const item = await addCustomCrisisKitItem("  Extra vatten  ", "Dricksvatten")

    expect(item.name).toBe("Extra vatten")
    expect(item.isCustom).toBe(true)
    expect(item.isOwned).toBe(false)
    expect(table.add).toHaveBeenCalledWith(item)
  })

  it("rejects an empty name", async () => {
    await expect(addCustomCrisisKitItem("   ", "Mat")).rejects.toThrow("Namnet får inte vara tomt.")

    expect(table.add).not.toHaveBeenCalled()
  })

  it("rejects an invalid category", async () => {
    await expect(
      addCustomCrisisKitItem("Extra vatten", "Invalid" as CrisisKitItem["category"])
    ).rejects.toThrow("Välj en giltig kategori.")

    expect(table.add).not.toHaveBeenCalled()
  })

  it("propagates database write failures", async () => {
    vi.mocked(table.add).mockRejectedValue(new Error("Storage failed"))

    await expect(addCustomCrisisKitItem("Extra vatten", "Dricksvatten")).rejects.toThrow(
      "Storage failed"
    )
  })
})

describe("updateCustomCrisisKitItem", () => {
  it("updates an existing custom item", async () => {
    vi.mocked(table.get).mockResolvedValue(customItem)

    await updateCustomCrisisKitItem(customItem.id, "Nytt namn", "Mat")

    expect(table.put).toHaveBeenCalledWith({
      ...customItem,
      name: "Nytt namn",
      category: "Mat",
    })
  })

  it("rejects empty names", async () => {
    await expect(updateCustomCrisisKitItem(customItem.id, "  ", "Mat")).rejects.toThrow(
      "Namnet får inte vara tomt."
    )

    expect(table.put).not.toHaveBeenCalled()
  })

  it("does not update a recommended item as a custom item", async () => {
    vi.mocked(table.get).mockResolvedValue(RECOMMENDED_CRISIS_KIT[0])

    await expect(
      updateCustomCrisisKitItem(RECOMMENDED_CRISIS_KIT[0].id, "Nytt namn", "Mat")
    ).rejects.toThrow("Det gick inte att hitta den egna saken.")

    expect(table.put).not.toHaveBeenCalled()
  })

  it("propagates database write failures", async () => {
    vi.mocked(table.get).mockResolvedValue(customItem)
    vi.mocked(table.put).mockRejectedValue(new Error("Storage failed"))

    await expect(updateCustomCrisisKitItem(customItem.id, "Nytt namn", "Mat")).rejects.toThrow(
      "Storage failed"
    )
  })

  it("updates a custom item's expiry date", async () => {
    vi.mocked(table.get).mockResolvedValue(customItem)

    await updateCustomCrisisKitItem(
      customItem.id,
      customItem.name,
      customItem.category,
      "2029-05-20"
    )

    expect(table.put).toHaveBeenCalledWith(
      expect.objectContaining({
        expirationDate: "2029-05-20",
      })
    )
  })

  it("removes a custom item's expiry date when passed null", async () => {
    vi.mocked(table.get).mockResolvedValue({
      ...customItem,
      expirationDate: "2028-05-20",
    })

    await updateCustomCrisisKitItem(customItem.id, customItem.name, customItem.category, null)

    const savedItem = vi.mocked(table.put).mock.calls[0][0]

    expect(savedItem).not.toHaveProperty("expirationDate")
  })
})

describe("deleteCustomCrisisKitItem", () => {
  it("deletes an existing custom item", async () => {
    vi.mocked(table.get).mockResolvedValue(customItem)

    await deleteCustomCrisisKitItem(customItem.id)

    expect(table.delete).toHaveBeenCalledWith(customItem.id)
  })

  it("does not delete a recommended item", async () => {
    vi.mocked(table.get).mockResolvedValue(RECOMMENDED_CRISIS_KIT[0])

    await expect(deleteCustomCrisisKitItem(RECOMMENDED_CRISIS_KIT[0].id)).rejects.toThrow(
      "Det gick inte att hitta den egna saken."
    )

    expect(table.delete).not.toHaveBeenCalled()
  })

  it("propagates database delete failures", async () => {
    vi.mocked(table.get).mockResolvedValue(customItem)
    vi.mocked(table.delete).mockRejectedValue(new Error("Storage failed"))

    await expect(deleteCustomCrisisKitItem(customItem.id)).rejects.toThrow("Storage failed")
  })
})
