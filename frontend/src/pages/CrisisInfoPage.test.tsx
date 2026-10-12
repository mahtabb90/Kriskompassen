// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DetailedCrisisCard from "../components/DetailedCrisisCard"
import ModeToggle from "../components/ModeToggle"
import { ModeProvider } from "../context/ModeProvider"
import { mockCrisisData } from "../data/mockCrisisData"
import { getOfflineItem, getOfflineItems, isSavedOffline } from "../services/offlineService"
import CrisisInfoPage from "./CrisisInfoPage"

vi.mock("../services/offlineService", () => ({
  getOfflineItem: vi.fn(),
  getOfflineItems: vi.fn(),
  isSavedOffline: vi.fn(),
  saveOffline: vi.fn(),
  removeOffline: vi.fn(),
}))

const offlineNotice = "Den informationen är inte sparad för offline-åtkomst."

function mountPage(
  pathname = "/crisis/food-in-crisis",
  state?: { notice: string; noticeMode: "online" | "offline" }
) {
  return render(
    <ModeProvider>
      <MemoryRouter initialEntries={[{ pathname, state }]}>
        <ModeToggle />
        <Routes>
          <Route path="/crisis" element={<CrisisInfoPage />} />
          <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
        </Routes>
      </MemoryRouter>
    </ModeProvider>
  )
}

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(getOfflineItem).mockResolvedValue(undefined)
  vi.mocked(getOfflineItems).mockResolvedValue([])
  vi.mocked(isSavedOffline).mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("CrisisInfoPage redirect notices", () => {
  it("hides the unsaved-item notice immediately when switching from offline back to online", async () => {
    mountPage()
    expect(screen.getByRole("heading", { level: 1, name: "Mat i kris" })).toBeTruthy()
    await screen.findByText("Inte sparad")

    fireEvent.click(screen.getByRole("radio", { name: "Offline" }))

    expect(await screen.findByText(offlineNotice)).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Krisinformation" })).toBeTruthy()
    await screen.findByText("Ingen krisinformation är sparad offline.")
    expect(screen.queryByRole("heading", { level: 2, name: "Mat i kris" })).toBe(null)

    fireEvent.click(screen.getByRole("radio", { name: "Online" }))

    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(screen.queryByText("Ingen krisinformation är sparad offline.")).toBe(null)
    for (const item of mockCrisisData) {
      expect(screen.getByRole("heading", { level: 2, name: item.title })).toBeTruthy()
    }
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(mockCrisisData.length)
  })

  it("hides a retained offline notice when the list mounts in online mode", async () => {
    mountPage("/crisis", { notice: offlineNotice, noticeMode: "offline" })

    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(mockCrisisData.length)
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(mockCrisisData.length)
  })

  it("keeps the not-found notice for an unavailable online article", async () => {
    mountPage("/crisis/missing-item")

    expect(await screen.findByText("Den informationen hittades inte.")).toBeTruthy()
    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(mockCrisisData.length)
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(mockCrisisData.length)
  })
})
