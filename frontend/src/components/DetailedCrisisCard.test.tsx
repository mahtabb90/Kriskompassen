// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import { mockCrisisData } from "../data/mockCrisisData"
import { isSavedOffline } from "../services/offlineService"
import DetailedCrisisCard from "./DetailedCrisisCard"

vi.mock("../services/offlineService", () => ({
  getOfflineItem: vi.fn(),
  isSavedOffline: vi.fn(),
  saveOffline: vi.fn(),
  removeOffline: vi.fn(),
}))

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(isSavedOffline).mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("DetailedCrisisCard link semantics", () => {
  it("names the back link without its decorative arrow and announces the new-tab source link", async () => {
    const item = mockCrisisData[0]
    render(
      <ModeProvider>
        <MemoryRouter initialEntries={[`/crisis/${item.id}`]}>
          <Routes>
            <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
          </Routes>
        </MemoryRouter>
      </ModeProvider>
    )

    expect(screen.getByRole("link", { name: "Tillbaka till krisinformation" })).toBeTruthy()
    const source = screen.getByRole("link", { name: /öppnas i ny flik/ })
    expect(source.getAttribute("href")).toBe(item.sourceUrl)
    expect(source.getAttribute("target")).toBe("_blank")
    expect(source.getAttribute("rel")).toBe("noopener noreferrer")
    expect(await screen.findByText("Inte sparad")).toBeTruthy()
  })
})
