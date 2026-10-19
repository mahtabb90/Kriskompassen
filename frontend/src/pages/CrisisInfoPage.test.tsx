// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DetailedCrisisCard from "../components/DetailedCrisisCard"
import ModeToggle from "../components/ModeToggle"
import { apiConfig } from "../config/apiConfig"
import { ModeProvider } from "../context/ModeProvider"
import { crisisItems, crisisResponse } from "../services/__fixtures__/crisis"
import {
  getOfflineItem,
  getOfflineItems,
  isSavedOffline,
  saveOffline,
} from "../services/offlineService"
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
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input) => crisisResponse(input))
  )
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(getOfflineItem).mockResolvedValue(undefined)
  vi.mocked(getOfflineItems).mockResolvedValue([])
  vi.mocked(isSavedOffline).mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("CrisisInfoPage redirect notices", () => {
  it("hides the unsaved-item notice immediately when switching from offline back to online", async () => {
    mountPage()
    expect(await screen.findByRole("heading", { level: 1, name: "Mat i kris" })).toBeTruthy()
    await screen.findByText("Inte sparad")

    fireEvent.click(savedSwitch())

    expect(await screen.findByText(offlineNotice)).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Krisinformation" })).toBeTruthy()
    await screen.findByText("Ingen krisinformation är sparad.")
    expect(screen.queryByRole("heading", { level: 2, name: "Mat i kris" })).toBe(null)

    fireEvent.click(savedSwitch())

    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(screen.queryByText("Ingen krisinformation är sparad.")).toBe(null)
    await screen.findAllByRole("heading", { level: 2 })
    for (const item of crisisItems) {
      expect(screen.getByRole("heading", { level: 2, name: item.title })).toBeTruthy()
    }
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(crisisItems.length)
  })

  it("hides a retained offline notice when the list mounts in online mode", async () => {
    mountPage("/crisis", { notice: offlineNotice, noticeMode: "offline" })

    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(crisisItems.length)
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(crisisItems.length)
  })

  it("keeps the not-found notice for an unavailable online article", async () => {
    mountPage("/crisis/missing-item")

    expect(await screen.findByText("Den informationen hittades inte.")).toBeTruthy()
    expect(screen.queryByText(offlineNotice)).toBe(null)
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(crisisItems.length)
    expect(await screen.findAllByText("Inte sparad")).toHaveLength(crisisItems.length)
  })
})

describe("CrisisInfoPage focus after removing an offline item", () => {
  async function openOfflineList(count: number) {
    const saved = crisisItems.slice(0, count)
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

describe("CrisisInfoPage backend loading", () => {
  it("distinguishes initial loading from a successful empty list", async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    mountPage("/crisis")
    expect(screen.getByText("Hämtar krisinformation…")).toBeTruthy()
    expect(screen.queryByText("Inga artiklar finns att visa just nu.")).toBeNull()
    await act(async () => finish(Response.json([])))
    expect(await screen.findByText("Inga artiklar finns att visa just nu.")).toBeTruthy()
    expect(screen.queryByText("Ingen krisinformation är sparad.")).toBeNull()
  })

  it("retries an error and returns keyboard focus to the stable heading", async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
    mountPage("/crisis")
    const heading = screen.getByRole("heading", { level: 1 })
    const retry = await screen.findByRole("button", { name: "Försök igen" })
    expect(screen.queryByText("Inga artiklar finns att visa just nu.")).toBeNull()
    retry.focus()
    fireEvent.click(retry)
    expect(retry.getAttribute("aria-disabled")).toBe("true")
    fireEvent.click(retry)
    expect(fetch).toHaveBeenCalledTimes(2)
    await act(async () => finish(crisisResponse(apiConfig.crisisUrl)))
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(crisisItems.length)
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading)
    expect(document.activeElement).toBe(heading)
  })

  it("does not move focus back when the user has left retry feedback", async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
    mountPage("/crisis")
    const retry = await screen.findByRole("button", { name: "Försök igen" })
    fireEvent.click(retry)
    const toggle = savedSwitch()
    toggle.focus()
    await act(async () => finish(Response.json([])))
    await screen.findByText("Inga artiklar finns att visa just nu.")
    expect(document.activeElement).toBe(toggle)
  })

  it("keeps offline data when an old network response arrives, then refetches online", async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const saved = { ...crisisItems[0], title: "Min sparade artikel", savedOffline: true }
    vi.mocked(getOfflineItems).mockResolvedValue([saved])
    mountPage("/crisis")
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal
    fireEvent.click(savedSwitch())
    expect(await screen.findByRole("heading", { level: 2, name: saved.title })).toBeTruthy()
    expect(signal?.aborted).toBe(true)
    await act(async () => finish(Response.json([{ ...crisisItems[0], title: "Gammalt svar" }])))
    expect(screen.queryByRole("heading", { name: "Gammalt svar" })).toBeNull()
    expect(screen.getByRole("heading", { name: saved.title })).toBeTruthy()
    fireEvent.click(savedSwitch())
    expect(screen.getByText("Hämtar krisinformation…")).toBeTruthy()
    expect(await screen.findAllByRole("heading", { level: 2 })).toHaveLength(crisisItems.length)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("makes no article request when initially offline and never rewrites older saved copies", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const legacy = { ...crisisItems[0], savedOffline: true }
    vi.mocked(getOfflineItems).mockResolvedValue([legacy])
    mountPage("/crisis")
    expect(await screen.findByRole("heading", { level: 2, name: legacy.title })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    expect(saveOffline).not.toHaveBeenCalled()
  })

  it("saves the complete API article only after an explicit user action", async () => {
    mountPage("/crisis")
    const save = await screen.findByRole("button", {
      name: `Spara offline: ${crisisItems[0].title}`,
    })
    await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false))
    expect(saveOffline).not.toHaveBeenCalled()
    fireEvent.click(save)
    await waitFor(() => expect(saveOffline).toHaveBeenCalledWith(crisisItems[0]))
  })
})
