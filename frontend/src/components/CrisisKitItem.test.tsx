// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  it("shows a warning when the expiration date has passed", () => {
    renderItem({ ...baseItem, expirationDate: "2020-01-01" })

    expect(screen.getByText("Det är dags att kontrollera saken igen.")).toBeTruthy()
    expect(screen.getByText(/Sparat datum:.*2020-01-01/s)).toBeTruthy()
  })

  it("does not show a warning for a future expiration date", () => {
    renderItem({ ...baseItem, expirationDate: "2099-12-31" })

    expect(screen.queryByText("Det är dags att kontrollera saken igen.")).toBeNull()
    expect(screen.getByText(/Sparat datum:.*2099-12-31/s)).toBeTruthy()
  })

  it("does not show a saved date or warning when the expiration date is missing", () => {
    renderItem(baseItem)

    expect(screen.queryByText("Sparat datum:")).toBeNull()
    expect(screen.queryByText("Det är dags att kontrollera saken igen.")).toBeNull()
  })
})

describe("CrisisKitItem interactions", () => {
  it("calls the ownership callback when the checkbox changes", async () => {
    renderItem(baseItem)

    fireEvent.click(screen.getByRole("checkbox"))

    await waitFor(() => {
      expect(onOwnershipChange).toHaveBeenCalledWith(baseItem, false)
    })
  })

  it("saves a changed expiration date", async () => {
    renderItem(baseItem)

    fireEvent.change(screen.getByLabelText("Utgångsdatum / kontrolldatum"), {
      target: { value: "2030-06-15" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Spara datum" }))

    await waitFor(() => {
      expect(onExpirationDateSave).toHaveBeenCalledWith(baseItem, "2030-06-15")
    })

    expect(await screen.findByText("Ändringen har sparats.")).toBeTruthy()
  })

  it("clears the expiration date when the cleared value is saved", async () => {
    renderItem({ ...baseItem, expirationDate: "2030-06-15" })

    fireEvent.click(screen.getByRole("button", { name: "Rensa datum" }))
    fireEvent.click(screen.getByRole("button", { name: "Spara datum" }))

    await waitFor(() => {
      expect(onExpirationDateSave).toHaveBeenCalledWith(
        { ...baseItem, expirationDate: "2030-06-15" },
        null
      )
    })
  })

  it("shows an error when saving the expiration date fails", async () => {
    onExpirationDateSave.mockRejectedValueOnce(new Error("Storage error"))
    renderItem(baseItem)

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
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    renderItem(customItem)
    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    expect(confirmSpy).toHaveBeenCalledWith('Vill du ta bort "Konserver" från din krislåda?')

    await waitFor(() => {
      expect(onCustomItemDelete).toHaveBeenCalledWith(customItem)
    })
  })

  it("does not delete a custom item when confirmation is canceled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)

    renderItem({ ...baseItem, isCustom: true })
    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    expect(onCustomItemDelete).not.toHaveBeenCalled()
  })

  it("shows an error when deletion fails", async () => {
    onCustomItemDelete.mockRejectedValueOnce(new Error("Storage failed"))
    vi.spyOn(window, "confirm").mockReturnValue(true)

    renderItem({ ...baseItem, isCustom: true })
    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Storage failed")
    expect(screen.getByRole("heading", { name: "Konserver" })).toBeTruthy()
  })
})
