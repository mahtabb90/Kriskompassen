// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  addCustomCrisisKitItem,
  getCrisisKitItems,
  updateCrisisKitItem,
  updateCustomCrisisKitItem,
  updateCustomCrisisKitItemOwnership,
  deleteCustomCrisisKitItem,
} from "../services/crisisKitService"
import type { CrisisKitItem } from "../types/crisisKit"
import CrisisKitPage from "./CrisisKitPage"

vi.mock("../services/crisisKitService", () => ({
  addCustomCrisisKitItem: vi.fn(),
  getCrisisKitItems: vi.fn(),
  updateCrisisKitItem: vi.fn(),
  updateCustomCrisisKitItem: vi.fn(),
  updateCustomCrisisKitItemOwnership: vi.fn(),
  deleteCustomCrisisKitItem: vi.fn(),
}))

const recommendedItem: CrisisKitItem = {
  id: "recommended-water",
  name: "Dricksvatten",
  category: "Dricksvatten",
  isOwned: false,
  isCustom: false,
}

const recommendedFoodItem: CrisisKitItem = {
  id: "recommended-rice",
  name: "Torrvaror: Ris",
  category: "Mat",
  subcategory: "Torrvaror",
  isOwned: false,
  isCustom: false,
}

const customItem: CrisisKitItem = {
  id: "custom-flashlight",
  name: "Ficklampa",
  category: "Kommunikation",
  isOwned: false,
  isCustom: true,
}

const customFoodItem: CrisisKitItem = {
  id: "custom-beans",
  name: "Egna bönor",
  category: "Mat",
  isOwned: false,
  isCustom: true,
}

const headingTestItems: CrisisKitItem[] = [
  {
    id: "a",
    name: "Konserver",
    category: "Mat",
    subcategory: "Torrvaror",
    isOwned: true,
    isCustom: false,
  },
  {
    id: "b",
    name: "Knäckebröd",
    category: "Mat",
    isOwned: false,
    isCustom: false,
  },
  {
    id: "c",
    name: "Vattenflaskor",
    category: "Dricksvatten",
    isOwned: false,
    isCustom: false,
  },
]

function mountPage() {
  return render(<CrisisKitPage />)
}

beforeEach(() => {
  vi.mocked(getCrisisKitItems).mockResolvedValue([recommendedItem])
  vi.mocked(addCustomCrisisKitItem).mockResolvedValue(customItem)
  vi.mocked(updateCrisisKitItem).mockResolvedValue(undefined)
  vi.mocked(updateCustomCrisisKitItem).mockResolvedValue(undefined)
  vi.mocked(updateCustomCrisisKitItemOwnership).mockResolvedValue(undefined)
  vi.mocked(deleteCustomCrisisKitItem).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("CrisisKitPage custom-item creation", () => {
  it("loads and displays the emergency-kit page", async () => {
    mountPage()

    expect(screen.getByRole("heading", { name: "Min krislåda" })).toBeTruthy()
    expect(await screen.findByText("Dricksvatten")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Lägg till en egen sak" })).toBeTruthy()
  })

  it("adds a custom item and resets the form after saving", async () => {
    mountPage()

    fireEvent.change(await screen.findByLabelText("Namn"), {
      target: { value: "Ficklampa" },
    })

    fireEvent.change(screen.getByLabelText("Kategori"), {
      target: { value: "Kommunikation" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Lägg till sak" }))

    await waitFor(() => {
      expect(addCustomCrisisKitItem).toHaveBeenCalledWith("Ficklampa", "Kommunikation")
    })

    expect(await screen.findByRole("heading", { name: "Ficklampa" })).toBeTruthy()
    expect((screen.getByLabelText("Namn") as HTMLInputElement).value).toBe("")
    expect((screen.getByLabelText("Kategori") as HTMLSelectElement).value).toBe("Övrigt")
  })

  it("prevents submission when the name contains only whitespace", async () => {
    mountPage()

    fireEvent.change(await screen.findByLabelText("Namn"), {
      target: { value: "   " },
    })

    const submitButton = screen.getByRole("button", { name: "Lägg till sak" })

    expect((submitButton as HTMLButtonElement).disabled).toBe(true)
    expect(addCustomCrisisKitItem).not.toHaveBeenCalled()
  })

  it("shows a storage error without adding an unsaved item", async () => {
    vi.mocked(addCustomCrisisKitItem).mockRejectedValueOnce(new Error("Storage failed"))

    mountPage()

    fireEvent.change(await screen.findByLabelText("Namn"), {
      target: { value: "Nödradio" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Lägg till sak" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Storage failed")
    expect(screen.queryByRole("heading", { name: "Nödradio" })).toBeNull()
  })

  it("shows an error if the initial load fails", async () => {
    vi.mocked(getCrisisKitItems).mockRejectedValueOnce(new Error("Storage failed"))

    mountPage()

    expect(
      await screen.findByText("Det gick inte att läsa in din krislåda. Försök igen.")
    ).toBeTruthy()
  })
})

describe("CrisisKitPage category sections", () => {
  it("renders all categories as native collapsible sections", async () => {
    mountPage()

    await screen.findByRole("heading", {
      name: "Dricksvatten",
      level: 2,
    })

    const categories = screen.getAllByText(
      /^(Mat|Dricksvatten|Toalett och hygien|Värme|Kommunikation|Läkemedel|Betalningar|Husdjur|Övrigt)$/
    )

    expect(document.querySelectorAll("details")).toHaveLength(9)
    expect(document.querySelectorAll("summary")).toHaveLength(9)
    expect(categories.length).toBeGreaterThanOrEqual(9)

    const waterCategory = screen.getByText("Dricksvatten", { selector: "h2" })
    const waterDetails = waterCategory.closest("details")

    expect(waterDetails).not.toBeNull()
    expect(waterDetails?.open).toBe(false)

    fireEvent.click(waterCategory.closest("summary")!)

    expect(waterDetails?.open).toBe(true)
  })

  it("shows a message for categories without items", async () => {
    mountPage()

    await screen.findByRole("heading", {
      name: "Dricksvatten",
      level: 2,
    })

    expect(screen.getAllByText("Inga saker i den här kategorin ännu.").length).toBe(8)
  })

  it("shows recommended and custom items in separate groups within a category", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([recommendedFoodItem, customFoodItem])

    mountPage()

    const foodCategoryHeading = await screen.findByRole("heading", {
      name: "Mat",
      level: 2,
    })
    const foodDetails = foodCategoryHeading.closest("details")

    expect(foodDetails).not.toBeNull()

    fireEvent.click(foodCategoryHeading.closest("summary")!)

    const category = within(foodDetails as HTMLElement)
    const recommendedGroupHeading = category.getByRole("heading", {
      name: "Rekommenderade saker",
      level: 3,
    })
    const customGroupHeading = category.getByRole("heading", {
      name: "Egna saker",
      level: 3,
    })

    const recommendedGroup = recommendedGroupHeading.closest("section")
    const customGroup = customGroupHeading.closest("section")

    expect(recommendedGroup).not.toBeNull()
    expect(customGroup).not.toBeNull()

    expect(
      within(recommendedGroup as HTMLElement).getByRole("heading", {
        name: "Torrvaror",
      })
    ).toBeTruthy()

    expect(
      within(recommendedGroup as HTMLElement).getByRole("heading", {
        name: "Torrvaror: Ris",
      })
    ).toBeTruthy()

    expect(
      within(customGroup as HTMLElement).getByRole("heading", {
        name: "Egna bönor",
      })
    ).toBeTruthy()

    expect(
      within(recommendedGroup as HTMLElement).queryByRole("heading", {
        name: "Egna bönor",
      })
    ).toBeNull()
  })

  it("only displays group headings when that group contains items", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([recommendedFoodItem, customItem])

    mountPage()

    const foodCategoryHeading = await screen.findByRole("heading", {
      name: "Mat",
      level: 2,
    })
    const foodDetails = foodCategoryHeading.closest("details") as HTMLElement

    fireEvent.click(foodCategoryHeading.closest("summary")!)

    expect(
      within(foodDetails).getByRole("heading", {
        name: "Rekommenderade saker",
        level: 3,
      })
    ).toBeTruthy()

    expect(
      within(foodDetails).queryByRole("heading", {
        name: "Egna saker",
        level: 3,
      })
    ).toBeNull()

    const communicationCategoryHeading = screen.getByRole("heading", {
      name: "Kommunikation",
      level: 2,
    })
    const communicationDetails = communicationCategoryHeading.closest("details") as HTMLElement

    fireEvent.click(communicationCategoryHeading.closest("summary")!)

    expect(
      within(communicationDetails).queryByRole("heading", {
        name: "Rekommenderade saker",
        level: 3,
      })
    ).toBeNull()

    expect(
      within(communicationDetails).getByRole("heading", {
        name: "Egna saker",
        level: 3,
      })
    ).toBeTruthy()
  })
})

describe("CrisisKitPage custom-item editing", () => {
  it("saves edited details through the service", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItem])

    mountPage()

    fireEvent.click(await screen.findByRole("button", { name: "Redigera" }))

    fireEvent.change(screen.getByLabelText("Namn", { selector: "#edit-name-custom-flashlight" }), {
      target: { value: "Nödlampa" },
    })

    fireEvent.change(
      screen.getByLabelText("Kategori", { selector: "#edit-category-custom-flashlight" }),
      { target: { value: "Övrigt" } }
    )

    fireEvent.click(screen.getByRole("button", { name: "Spara ändringar" }))

    await waitFor(() => {
      expect(updateCustomCrisisKitItem).toHaveBeenCalledWith(
        customItem.id,
        "Nödlampa",
        "Övrigt",
        undefined
      )
    })
  })

  it("updates the displayed name and category after editing", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItem])

    mountPage()

    fireEvent.click(await screen.findByRole("button", { name: "Redigera" }))

    fireEvent.change(screen.getByLabelText("Namn", { selector: "#edit-name-custom-flashlight" }), {
      target: { value: "Nödlampa" },
    })

    fireEvent.change(
      screen.getByLabelText("Kategori", { selector: "#edit-category-custom-flashlight" }),
      { target: { value: "Övrigt" } }
    )

    fireEvent.click(screen.getByRole("button", { name: "Spara ändringar" }))

    expect(await screen.findByRole("heading", { name: "Nödlampa" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Övrigt" })).toBeTruthy()
    expect(screen.getByText("Övrigt", { selector: "p" })).toBeTruthy()
  })

  it("keeps the existing item visible when editing fails", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItem])
    vi.mocked(updateCustomCrisisKitItem).mockRejectedValueOnce(new Error("Storage failed"))

    mountPage()

    fireEvent.click(await screen.findByRole("button", { name: "Redigera" }))

    fireEvent.change(screen.getByLabelText("Namn", { selector: "#edit-name-custom-flashlight" }), {
      target: { value: "Nödlampa" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Spara ändringar" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Storage failed")
    expect(screen.getByLabelText("Namn", { selector: "#edit-name-custom-flashlight" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Spara ändringar" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Nödlampa" })).toBeNull()
  })
})

describe("CrisisKitPage custom-item deletion", () => {
  it("deletes a custom item through the service and removes it from the page", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItem])
    vi.spyOn(window, "confirm").mockReturnValue(true)

    mountPage()

    expect(await screen.findByRole("heading", { name: "Ficklampa" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    await waitFor(() => {
      expect(deleteCustomCrisisKitItem).toHaveBeenCalledWith(customItem.id)
    })

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Ficklampa" })).toBeNull()
    })
  })

  it("keeps the item visible when deletion fails", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItem])
    vi.mocked(deleteCustomCrisisKitItem).mockRejectedValueOnce(new Error("Storage failed"))
    vi.spyOn(window, "confirm").mockReturnValue(true)

    mountPage()

    expect(await screen.findByRole("heading", { name: "Ficklampa" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    expect((await screen.findByRole("alert")).textContent).toContain("Storage failed")
    expect(screen.getByRole("heading", { name: "Ficklampa" })).toBeTruthy()
  })
})

describe("CrisisKitPage heading structure", () => {
  it("nests category, subcategory and item headings without skipping a level", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue(headingTestItems)

    render(<CrisisKitPage />)

    await screen.findByRole("heading", {
      level: 2,
      name: "Mat",
      hidden: true,
    })

    // Closed <details> content may be treated as inaccessible, so include hidden headings.
    const headings = screen.getAllByRole("heading", { hidden: true })
    const levels = headings.map((heading) => Number(heading.tagName.slice(1)))

    expect(levels[0]).toBe(1)

    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1)
    })

    expect(screen.getByRole("heading", { level: 2, name: "Mat", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 4, name: "Torrvaror", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 4, name: "Konserver", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "Knäckebröd", hidden: true })).toBeTruthy()
  })

  it("places each category heading inside its disclosure summary", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue(headingTestItems)

    const { container } = render(<CrisisKitPage />)

    await screen.findByRole("heading", {
      level: 2,
      name: "Mat",
      hidden: true,
    })

    expect(container.querySelector("summary h2")?.textContent).toBe("Mat")
  })
})

describe("CrisisKitPage sources", () => {
  it("displays the source links and offline note", async () => {
    mountPage()

    const sourcesSection = screen.getByRole("region", { name: "Källor" })

    expect(
      within(sourcesSection).getByText(
        "De rekommenderade sakerna i krislådan bygger på information från följande källor:"
      )
    ).toBeTruthy()

    const crisisInformationLink = within(sourcesSection).getByRole("link", {
      name: "Krisinformation.se – Hemberedskap (öppnas i ny flik)",
    })
    expect(crisisInformationLink.getAttribute("href")).toBe(
      "https://www.krisinformation.se/din-beredskap/hemberedskap/"
    )
    expect(crisisInformationLink.getAttribute("target")).toBe("_blank")
    expect(crisisInformationLink.getAttribute("rel")).toBe("noopener noreferrer")

    const mcfLink = within(sourcesSection).getByRole("link", {
      name: "Myndigheten för civilt försvar – Om krisen eller kriget kommer (öppnas i ny flik)",
    })
    expect(mcfLink.getAttribute("href")).toBe(
      "https://www.mcf.se/sv/publikationer/om-krisen-eller-kriget-kommer/"
    )
    expect(mcfLink.getAttribute("target")).toBe("_blank")
    expect(mcfLink.getAttribute("rel")).toBe("noopener noreferrer")

    expect(within(sourcesSection).getByText("Länkarna kräver internetanslutning.")).toBeTruthy()
  })

  it("keeps the sources visible when loading the crisis kit fails", async () => {
    vi.mocked(getCrisisKitItems).mockRejectedValueOnce(new Error("Storage failed"))

    mountPage()

    expect(
      await screen.findByText("Det gick inte att läsa in din krislåda. Försök igen.")
    ).toBeTruthy()
    expect(screen.getByRole("region", { name: "Källor" })).toBeTruthy()
  })
})
