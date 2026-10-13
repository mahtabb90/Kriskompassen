// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getCrisisKitItems } from "../services/crisisKitService"
import type { CrisisKitItem } from "../types/crisisKit"
import CrisisKitPage from "./CrisisKitPage"

vi.mock("../services/crisisKitService", () => ({
  getCrisisKitItems: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const items: CrisisKitItem[] = [
  {
    id: "a",
    name: "Konserver",
    category: "Mat",
    subcategory: "Torrvaror",
    isOwned: true,
    isCustom: false,
  },
  { id: "b", name: "Knäckebröd", category: "Mat", isOwned: false, isCustom: false },
  { id: "c", name: "Vattenflaskor", category: "Dricksvatten", isOwned: false, isCustom: false },
]

describe("CrisisKitPage heading structure", () => {
  it("nests category, subcategory and item headings without skipping a level", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue(items)
    render(<CrisisKitPage />)
    await screen.findByRole("heading", { level: 2, name: "Mat", hidden: true })

    // Closed <details> content may be treated as inaccessible, so include hidden headings.
    const headings = screen.getAllByRole("heading", { hidden: true })
    const levels = headings.map((heading) => Number(heading.tagName.slice(1)))

    expect(levels[0]).toBe(1)
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1)
    })
    expect(screen.getByRole("heading", { level: 2, name: "Mat", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "Torrvaror", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 4, name: "Konserver", hidden: true })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "Knäckebröd", hidden: true })).toBeTruthy()
  })

  it("places each category heading inside its disclosure summary", async () => {
    vi.mocked(getCrisisKitItems).mockResolvedValue(items)
    const { container } = render(<CrisisKitPage />)
    await screen.findByRole("heading", { level: 2, name: "Mat", hidden: true })

    expect(container.querySelector("summary h2")?.textContent).toBe("Mat")
  })
})
