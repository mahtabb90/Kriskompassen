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

function dateOffsetFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

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

describe("CrisisKitPage ownership changes", () => {
  it("saves missing status and clears a recommended item's date together", async () => {
    const itemWithDate = {
      ...recommendedItem,
      isOwned: true,
      expirationDate: "2030-06-15",
    }
    vi.mocked(getCrisisKitItems).mockResolvedValue([itemWithDate])
    mountPage()

    fireEvent.click(await screen.findByRole("checkbox"))
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ja, markera som saknas",
      })
    )

    await waitFor(() => {
      expect(updateCrisisKitItem).toHaveBeenCalledWith(itemWithDate.id, {
        isOwned: false,
        expirationDate: null,
      })
    })
    expect(
      screen.queryByText("Markera varan som Finns för att kunna lägga till ett utgångsdatum.")
    ).toBeNull()
  })

  it("clears a custom item's date when confirming that it is missing", async () => {
    const customItemWithDate = {
      ...customItem,
      isOwned: true,
      expirationDate: "2030-06-15",
    }
    vi.mocked(getCrisisKitItems).mockResolvedValue([customItemWithDate])
    mountPage()

    fireEvent.click(await screen.findByRole("checkbox"))
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ja, markera som saknas",
      })
    )

    await waitFor(() => {
      expect(updateCustomCrisisKitItem).toHaveBeenCalledWith(
        customItemWithDate.id,
        customItemWithDate.name,
        customItemWithDate.category,
        null
      )
    })
    expect(updateCustomCrisisKitItemOwnership).not.toHaveBeenCalled()
  })
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
    expect(
      await screen.findByText("Saken har lagts till i din krislåda.", {
        selector: '[role="status"]',
      })
    ).toBeTruthy()
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

describe("CrisisKitPage expiration summary", () => {
  it("shows the expired and soon-to-expire counts while keeping the item list collapsed by default", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([
      {
        ...recommendedFoodItem,
        id: "expired-1",
        name: "Konserverade tomater",
        isOwned: true,
        expirationDate: dateOffsetFromToday(-18),
      },
      {
        ...recommendedFoodItem,
        id: "expired-2",
        name: "Havregryn",
        isOwned: true,
        expirationDate: dateOffsetFromToday(-15),
      },
      {
        ...recommendedFoodItem,
        id: "soon-1",
        name: "Knäckebröd",
        isOwned: true,
        expirationDate: dateOffsetFromToday(6),
      },
      {
        ...recommendedItem,
        id: "soon-2",
        name: "Vatten på flaska",
        isOwned: true,
        expirationDate: dateOffsetFromToday(13),
      },
      {
        ...recommendedItem,
        id: "ok-1",
        name: "Vattenreserv",
        isOwned: true,
        expirationDate: dateOffsetFromToday(45),
      },
      {
        ...recommendedItem,
        id: "missing-1",
        name: "Saknad vara",
        isOwned: false,
        expirationDate: dateOffsetFromToday(-15),
      },
      { ...recommendedItem, id: "no-date-1", name: "Filt", isOwned: true },
    ])
    mountPage()

    const reviewSection = screen.getByRole("region", { name: "Utgångsdatum att se över" })

    await waitFor(() => {
      expect(within(reviewSection).getByText("4", { selector: "span" })).toBeTruthy()
    })
    expect(within(reviewSection).getByText(/saker att se över/)).toBeTruthy()
    expect(screen.getAllByText("2", { selector: "p.text-3xl" })).toHaveLength(2)
    expect(screen.getByText("varor har gått ut")).toBeTruthy()
    expect(screen.getByText("varor går snart ut")).toBeTruthy()

    const reviewDetails = screen.getByText("Visa varor att se över").closest("details")
    expect(reviewDetails).not.toBeNull()
    expect((reviewDetails as HTMLDetailsElement).open).toBe(false)
    expect(
      within(reviewDetails as HTMLElement).getByRole("heading", {
        name: "Har gått ut (2)",
      })
    ).toBeTruthy()
  })

  it("shows expired and soon-to-expire items in separate groups when expanded", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([
      {
        ...recommendedFoodItem,
        id: "expired-later",
        name: "Havregryn",
        isOwned: true,
        expirationDate: dateOffsetFromToday(-15),
      },
      {
        ...recommendedFoodItem,
        id: "expired-earlier",
        name: "Konserverade tomater",
        isOwned: true,
        expirationDate: dateOffsetFromToday(-18),
      },
      {
        ...recommendedFoodItem,
        id: "soon-later",
        name: "Vatten på flaska",
        isOwned: true,
        expirationDate: dateOffsetFromToday(13),
      },
      {
        ...recommendedFoodItem,
        id: "soon-earlier",
        name: "Knäckebröd",
        isOwned: true,
        expirationDate: dateOffsetFromToday(6),
      },
    ])
    mountPage()

    const summary = await screen.findByText("Visa varor att se över")
    fireEvent.click(summary)

    const reviewDetails = summary.closest("details") as HTMLDetailsElement
    const reviewContent = within(reviewDetails)

    expect(reviewContent.getByRole("heading", { name: "Har gått ut (2)" })).toBeTruthy()
    expect(reviewContent.getByRole("heading", { name: "Går snart ut (2)" })).toBeTruthy()

    const expiredSection = reviewContent
      .getByRole("heading", {
        name: "Har gått ut (2)",
      })
      .closest("section") as HTMLElement
    const soonSection = reviewContent
      .getByRole("heading", {
        name: "Går snart ut (2)",
      })
      .closest("section") as HTMLElement

    const expiredItems = within(expiredSection).getAllByRole("listitem")
    const soonItems = within(soonSection).getAllByRole("listitem")

    expect(expiredItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Konserverade tomater"),
      expect.stringContaining("Havregryn"),
    ])
    expect(soonItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Knäckebröd"),
      expect.stringContaining("Vatten på flaska"),
    ])
  })

  it("shows an empty message when no owned items need review", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue([
      { ...recommendedItem, isOwned: false, expirationDate: dateOffsetFromToday(-15) },
      { ...recommendedItem, id: "no-date", isOwned: true },
      { ...recommendedItem, id: "ok", isOwned: true, expirationDate: dateOffsetFromToday(45) },
    ])
    mountPage()

    const reviewSection = screen.getByRole("region", { name: "Utgångsdatum att se över" })
    const totalCount = within(reviewSection).getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element.textContent?.replace(/\\s+/g, " ").trim() === "0 saker att se över"
    )
    expect(totalCount).toBeTruthy()
    const summary = screen.getByText("Visa varor att se över")
    fireEvent.click(summary)
    expect(screen.getByText("Det finns inga varor att se över just nu.")).toBeTruthy()
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

    expect(document.querySelectorAll("details:not(.expiration-review)")).toHaveLength(9)
    expect(document.querySelectorAll("details:not(.expiration-review) > summary")).toHaveLength(9)
    expect(categories.length).toBeGreaterThanOrEqual(9)

    const waterCategory = screen.getByText("Dricksvatten", { selector: "h2" })
    const waterDetails = waterCategory.closest("details")

    expect(waterDetails).not.toBeNull()
    expect(waterDetails?.open).toBe(false)

    fireEvent.click(waterCategory.closest("summary")!)

    expect(waterDetails?.open).toBe(true)
  })

  it("shows a decorative icon beside every category heading without changing its name", async () => {
    mountPage()

    const heading = await screen.findByRole("heading", { name: "Dricksvatten", level: 2 })
    const summaries = document.querySelectorAll("details:not(.expiration-review) > summary")

    expect(heading.textContent).toBe("Dricksvatten")
    expect(heading.querySelector("svg")).toBeNull()
    summaries.forEach((summary) => {
      expect(summary.querySelector("svg[aria-hidden='true'][focusable='false']")).not.toBeNull()
    })
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

    mountPage()

    expect(await screen.findByRole("heading", { name: "Ficklampa" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    const dialog = screen.getByRole("dialog")

    expect(within(dialog).getByText('Vill du ta bort "Ficklampa" från din krislåda?')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("button", { name: "Ja, ta bort" }))

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

    mountPage()

    expect(await screen.findByRole("heading", { name: "Ficklampa" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Ja, ta bort",
      })
    )

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
