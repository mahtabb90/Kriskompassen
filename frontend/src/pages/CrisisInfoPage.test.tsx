// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

function savedSwitch() {
  return screen.getByRole("switch", { name: "Sparad information" })
}

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

    fireEvent.click(savedSwitch())

    expect(await screen.findByText(offlineNotice)).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Krisinformation" })).toBeTruthy()
    await screen.findByText("Ingen krisinformation är sparad.")
    expect(screen.queryByRole("heading", { level: 2, name: "Mat i kris" })).toBe(null)

    fireEvent.click(savedSwitch())

    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(screen.queryByText("Ingen krisinformation är sparad.")).toBe(null)
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

describe("CrisisInfoPage focus after removing an offline item", () => {
  async function openOfflineList(count: number) {
    const saved = mockCrisisData.slice(0, count)
    vi.mocked(getOfflineItems).mockResolvedValue(saved)
    vi.mocked(isSavedOffline).mockResolvedValue(true)
    mountPage("/crisis")
    fireEvent.click(savedSwitch())
    await screen.findAllByText("Sparad offline")
    return saved
  }

  function removeButton(title: string) {
    return screen.getByRole("button", { name: `Ta bort offlinekopia: ${title}` })
  }

  function expectFocusOnCardLink(id: string) {
    expect(document.activeElement?.getAttribute("href")).toBe(`/crisis/${id}`)
  }

  it("moves focus to the next card's link", async () => {
    const saved = await openOfflineList(3)
    const button = removeButton(saved[0].title)
    button.focus()

    fireEvent.click(button)

    await waitFor(() => expectFocusOnCardLink(saved[1].id))
  })

  it("moves focus to the previous card's link when the last card is removed", async () => {
    const saved = await openOfflineList(3)
    const button = removeButton(saved[2].title)
    button.focus()

    fireEvent.click(button)

    await waitFor(() => expectFocusOnCardLink(saved[1].id))
  })

  it("moves focus to the page heading when the list becomes empty", async () => {
    const saved = await openOfflineList(1)
    const button = removeButton(saved[0].title)
    button.focus()

    fireEvent.click(button)

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { level: 1, name: "Krisinformation" })
      )
    )
    expect(await screen.findByText("Ingen krisinformation är sparad.")).toBeTruthy()
  })

  it("keeps focus where the user put it when another control has focus", async () => {
    const saved = await openOfflineList(2)
    const toggle = savedSwitch()
    toggle.focus()

    fireEvent.click(removeButton(saved[0].title))

    await screen.findByText(`"${saved[0].title}" har tagits bort från offlinelagringen.`, {
      selector: "[role=status]",
    })
    expect(document.activeElement).toBe(toggle)
  })
})

describe("CrisisInfoPage saved-information empty state", () => {
  it("explains how to save articles when the switch is on and nothing is saved", async () => {
    mountPage("/crisis")

    fireEvent.click(savedSwitch())

    expect(await screen.findByText("Ingen krisinformation är sparad.")).toBeTruthy()
    expect(
      screen.getByText(/Stäng av Sparad information och välj "Spara offline"/).textContent
    ).toContain("De visas sedan här.")
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0)
  })
})
