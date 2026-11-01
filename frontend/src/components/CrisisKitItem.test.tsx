// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CrisisKitItem from "./CrisisKitItem"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"

const baseItem: CrisisKitItemType = {
  id: "test-item",
  name: "Konserver",
  category: "Mat",
  isOwned: true,
  isCustom: false,
}

const onOwnershipChange = vi.fn().mockResolvedValue(undefined)
const onExpirationDateSave = vi.fn().mockResolvedValue(undefined)
const onCustomItemSave = vi.fn().mockResolvedValue(undefined)
const onCustomItemDelete = vi.fn().mockResolvedValue(undefined)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

beforeEach(() => {
  onOwnershipChange.mockResolvedValue(undefined)
  onExpirationDateSave.mockResolvedValue(undefined)
  onCustomItemSave.mockResolvedValue(undefined)
  onCustomItemDelete.mockResolvedValue(undefined)
})

function renderItem(item: CrisisKitItemType, headingLevel: 3 | 4 = 3) {
  return render(
    <CrisisKitItem
      item={item}
      headingLevel={headingLevel}
      onOwnershipChange={onOwnershipChange}
      onExpirationDateSave={onExpirationDateSave}
      onCustomItemSave={onCustomItemSave}
      onCustomItemDelete={onCustomItemDelete}
    />
  )
}

describe("CrisisKitItem heading level", () => {
  it("renders the name as an h3 by default and as an h4 when nested under a subcategory", () => {
    renderItem(baseItem)
    expect(screen.getByRole("heading", { level: 3, name: "Konserver" })).toBeTruthy()

    cleanup()
    renderItem(baseItem, 4)
    expect(screen.getByRole("heading", { level: 4, name: "Konserver" })).toBeTruthy()
  })
})

describe("CrisisKitItem expiration dates", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-30T12:00:00"))
  })

  it("shows the expired status when the expiration date has passed", () => {
    renderItem({ ...baseItem, expirationDate: "2020-01-01" })

    expect(screen.getByText("Utgången")).toBeTruthy()
    expect(screen.getByRole("button", { name: /1 januari 2020/i })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /1 januari 2020/i }))
    expect(screen.getByLabelText("Utgångsdatum / kontrolldatum")).toBeTruthy()
  })

  it("shows the soon-expiring status for a date within 30 days", () => {
    renderItem({ ...baseItem, expirationDate: "2026-11-15" })

    expect(screen.getByText("Går snart ut")).toBeTruthy()
    expect(screen.getByRole("button", { name: /15 november 2026/i })).toBeTruthy()
  })

  it("shows the soon-expiring status when the expiration date is today", () => {
    renderItem({ ...baseItem, expirationDate: "2026-10-30" })

    expect(screen.getByText("Går snart ut")).toBeTruthy()
  })

  it("shows the soon-expiring status on the 30-day boundary", () => {
    renderItem({ ...baseItem, expirationDate: "2026-11-29" })

    expect(screen.getByText("Går snart ut")).toBeTruthy()
  })

  it("shows the OK status when the expiration date is more than 30 days away", () => {
    renderItem({ ...baseItem, expirationDate: "2026-11-30" })

    expect(screen.getByText("OK")).toBeTruthy()
  })

  it("does not show a saved date or status when the expiration date is missing", () => {
    renderItem(baseItem)

    expect(screen.queryByText("Sparat datum:")).toBeNull()
    expect(screen.queryByText("Utgången")).toBeNull()
    expect(screen.queryByText("Går snart ut")).toBeNull()
    expect(screen.queryByText("OK")).toBeNull()
    expect(screen.queryByText("Det är dags att kontrollera saken igen.")).toBeNull()
  })

  it("hides the expiration date and editor for an item marked as missing", () => {
    renderItem({ ...baseItem, isOwned: false, expirationDate: "2030-06-15" })

    expect(
      screen.queryByText("Markera varan som Finns för att kunna lägga till ett utgångsdatum.")
    ).toBeNull()
    expect(screen.queryByRole("button", { name: /15 juni 2030/i })).toBeNull()
    expect(screen.queryByRole("button", { name: "Lägg till kontrolldatum" })).toBeNull()
    expect(screen.queryByLabelText("Utgångsdatum / kontrolldatum")).toBeNull()
  })

  it("does not offer date entry for a missing item without an existing date", () => {
    renderItem({ ...baseItem, isOwned: false })

    expect(
      screen.queryByText("Markera varan som Finns för att kunna lägga till ett utgångsdatum.")
    ).toBeNull()
    expect(screen.queryByRole("button", { name: /kontrolldatum/i })).toBeNull()
  })
})

describe("CrisisKitItem interactions", () => {
  it("calls the ownership callback when an item without a date is marked as missing", async () => {
    renderItem(baseItem)

    fireEvent.click(screen.getByRole("checkbox"))

    await waitFor(() => {
      expect(onOwnershipChange).toHaveBeenCalledWith(baseItem, false)
    })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks for confirmation before clearing a saved date", () => {
    const itemWithDate = { ...baseItem, expirationDate: "2030-06-15" }
    renderItem(itemWithDate)

    fireEvent.click(screen.getByRole("checkbox"))

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Vill du markera varan som saknas?")).toBeTruthy()
    expect(within(dialog).getByText("Varans kontrolldatum kommer att raderas.")).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Avbryt" })).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Ja, markera som saknas" })).toBeTruthy()
    expect(onOwnershipChange).not.toHaveBeenCalled()
  })

  it("preserves ownership and the saved date when the confirmation is canceled", () => {
    const itemWithDate = { ...baseItem, expirationDate: "2030-06-15" }
    renderItem(itemWithDate)

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Avbryt" }))

    expect(onOwnershipChange).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("button", { name: /15 juni 2030/i })).toBeTruthy()
  })

  it("clears the saved date after the user confirms marking the item as missing", async () => {
    const itemWithDate = { ...baseItem, expirationDate: "2030-06-15" }
    renderItem(itemWithDate)

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ja, markera som saknas",
      })
    )

    await waitFor(() => {
      expect(onOwnershipChange).toHaveBeenCalledWith(itemWithDate, false)
    })
    expect(onExpirationDateSave).not.toHaveBeenCalled()
  })

  it("saves a changed expiration date", async () => {
    renderItem(baseItem)

    fireEvent.click(screen.getByRole("button", { name: "Lägg till kontrolldatum" }))
    fireEvent.change(screen.getByLabelText("Utgångsdatum / kontrolldatum"), {
      target: { value: "2030-06-15" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Spara datum" }))

    await waitFor(() => {
      expect(onExpirationDateSave).toHaveBeenCalledWith(baseItem, "2030-06-15")
    })

    expect(await screen.findByText("Ändringen har sparats.")).toBeTruthy()
  })

  it("clears the expiration date immediately when Rensa datum is clicked", async () => {
    const itemWithDate = { ...baseItem, expirationDate: "2030-06-15" }
    renderItem(itemWithDate)

    fireEvent.click(screen.getByRole("button", { name: /15 juni 2030/i }))
    fireEvent.click(screen.getByRole("button", { name: "Rensa datum" }))

    await waitFor(() => {
      expect(onExpirationDateSave).toHaveBeenCalledWith(itemWithDate, null)
    })

    expect(await screen.findByText("Ändringen har sparats.")).toBeTruthy()
  })

  it("shows an error when saving the expiration date fails", async () => {
    onExpirationDateSave.mockRejectedValueOnce(new Error("Storage error"))
    renderItem(baseItem)

    fireEvent.click(screen.getByRole("button", { name: "Lägg till kontrolldatum" }))
    fireEvent.change(screen.getByLabelText("Utgångsdatum / kontrolldatum"), {
      target: { value: "2030-06-15" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Spara datum" }))

    expect(
      await screen.findByText(
        "Det gick inte att spara datumet. Kontrollera datumet och försök igen."
      )
    ).toBeTruthy()
  })

  it("opens the editor with the current name and category", () => {
    renderItem({ ...baseItem, isCustom: true })

    fireEvent.click(screen.getByRole("button", { name: "Redigera" }))

    expect((screen.getByLabelText("Namn") as HTMLInputElement).value).toBe("Konserver")
    expect((screen.getByLabelText("Kategori") as HTMLSelectElement).value).toBe("Mat")
  })

  it("saves changes to a custom item", async () => {
    const customItem = { ...baseItem, isCustom: true }
    renderItem(customItem)

    fireEvent.click(screen.getByRole("button", { name: "Redigera" }))
    fireEvent.change(screen.getByLabelText("Namn"), {
      target: { value: "Ris" },
    })
    fireEvent.change(screen.getByLabelText("Kategori"), {
      target: { value: "Övrigt" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Spara ändringar" }))

    await waitFor(() => {
      expect(onCustomItemSave).toHaveBeenCalledWith(customItem, "Ris", "Övrigt")
    })

    expect(screen.queryByRole("button", { name: "Spara ändringar" })).toBeNull()
    expect(screen.getByRole("button", { name: "Redigera" })).toBeTruthy()
  })

  it("cancels editing without saving", () => {
    renderItem({ ...baseItem, isCustom: true })

    fireEvent.click(screen.getByRole("button", { name: "Redigera" }))
    fireEvent.change(screen.getByLabelText("Namn"), {
      target: { value: "Ändrat namn" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }))

    expect(screen.getByRole("heading", { name: "Konserver" })).toBeTruthy()
    expect(onCustomItemSave).not.toHaveBeenCalled()
  })

  it("shows an error and keeps the editor open when saving fails", async () => {
    onCustomItemSave.mockRejectedValueOnce(new Error("Storage error"))
    renderItem({ ...baseItem, isCustom: true })

    fireEvent.click(screen.getByRole("button", { name: "Redigera" }))
    fireEvent.change(screen.getByLabelText("Namn"), {
      target: { value: "Ris" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Spara ändringar" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Storage error")
    expect(screen.getByLabelText("Namn")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Spara ändringar" })).toBeTruthy()
  })
})

describe("CrisisKitItem deletion", () => {
  it("shows the delete button only for custom items", () => {
    renderItem(baseItem)

    expect(screen.queryByRole("button", { name: "Ta bort" })).toBeNull()

    cleanup()
    renderItem({ ...baseItem, isCustom: true })

    expect(screen.getByRole("button", { name: "Ta bort" })).toBeTruthy()
  })

  it("deletes a custom item after confirmation", async () => {
    const customItem = { ...baseItem, isCustom: true }

    renderItem(customItem)
    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    const dialog = screen.getByRole("dialog")

    expect(within(dialog).getByText('Vill du ta bort "Konserver" från din krislåda?')).toBeTruthy()
    expect(within(dialog).getByText("Åtgärden kan inte ångras.")).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("button", { name: "Ja, ta bort" }))

    await waitFor(() => {
      expect(onCustomItemDelete).toHaveBeenCalledWith(customItem)
    })
  })

  it("does not delete a custom item when confirmation is canceled", () => {
    renderItem({ ...baseItem, isCustom: true })

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    const dialog = screen.getByRole("dialog")

    fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }))

    expect(onCustomItemDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("heading", { name: "Konserver" })).toBeTruthy()
  })

  it("shows an error when deletion fails", async () => {
    onCustomItemDelete.mockRejectedValueOnce(new Error("Storage failed"))

    renderItem({ ...baseItem, isCustom: true })
    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ja, ta bort",
      })
    )

    expect((await screen.findByRole("alert")).textContent).toContain("Storage failed")
    expect(screen.getByRole("heading", { name: "Konserver" })).toBeTruthy()
  })
})
