// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressProvider } from "../context/AddressProvider"
import { ModeProvider } from "../context/ModeProvider"
import CrisisInfoPage from "../pages/CrisisInfoPage"
import CrisisKitPage from "../pages/CrisisKitPage"
import HomePage from "../pages/HomePage"
import NotFoundPage from "../pages/NotFoundPage"
import { feed } from "../services/__fixtures__/vma"
import AppLayout from "./AppLayout"
import DetailedCrisisCard from "./DetailedCrisisCard"

vi.mock("../services/offlineService", () => ({
  getOfflineItem: vi.fn().mockResolvedValue(undefined),
  getOfflineItems: vi.fn().mockResolvedValue([]),
  isSavedOffline: vi.fn().mockResolvedValue(false),
  saveOffline: vi.fn(),
  removeOffline: vi.fn(),
}))

vi.mock("../services/crisisKitService", () => ({
  getCrisisKitItems: vi.fn().mockResolvedValue([]),
}))

// This file exercises route/landmark structure, not addresses; stub the storage boundary
// so AddressProvider (rendered by the real Header/AddressIndicator) never touches IndexedDB,
// which jsdom does not implement.
vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn().mockResolvedValue([]),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async () => Response.json(feed([])))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("routed page structure", () => {
  it.each(["/", "/crisis", "/crisis-kit", "/crisis/food-in-crisis", "/no-such-page"])(
    "%s has one page heading, one main landmark and one primary navigation",
    async (path) => {
      render(
        <ModeProvider>
          <AddressProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/crisis" element={<CrisisInfoPage />} />
                  <Route path="/crisis-kit" element={<CrisisKitPage />} />
                  <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </AddressProvider>
        </ModeProvider>
      )

      const headings = await screen.findAllByRole("heading", { level: 1 })
      expect(headings).toHaveLength(1)
      expect(headings[0].id).toBe("page-heading")
      expect(screen.getAllByRole("main")).toHaveLength(1)
      expect(screen.getAllByRole("navigation", { name: "Huvudnavigation" })).toHaveLength(1)
    }
  )
})
