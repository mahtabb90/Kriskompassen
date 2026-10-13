// @vitest-environment jsdom
import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressProvider } from "../context/AddressProvider"
import { ModeProvider } from "../context/ModeProvider"
import { useMode } from "../context/modeContext"
import { alert, feed, info, multipleAlerts, now } from "../services/__fixtures__/vma"
import AppLayout from "./AppLayout"
import { installDialogTestMethods } from "./__fixtures__/dialog"

// This file exercises VMA/layout behavior, not addresses; stub the storage boundary so
// AddressProvider (rendered by the real Header/AddressIndicator) never touches IndexedDB,
// which jsdom does not implement.
vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn().mockResolvedValue([]),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

let fetchMock = vi.fn<typeof fetch>()
const measureCallbacks: Array<() => void> = []
let restoreDialog: () => void

function Page({ title }: { title: string }) {
  const { mode } = useMode()
  const { pathname } = useLocation()
  return (
    <h1 id="page-heading" tabIndex={-1} data-pathname={pathname}>
      {mode === "offline" ? `${title} – offline` : title}
    </h1>
  )
}

function mountLayout() {
  return render(
    <StrictMode>
      <ModeProvider>
        <AddressProvider>
          <MemoryRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Page title="Hem" />} />
                <Route path="crisis" element={<Page title="Krisinformation" />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AddressProvider>
      </ModeProvider>
    </StrictMode>
  )
}

beforeEach(() => {
  restoreDialog = installDialogTestMethods()
  vi.spyOn(Date, "now").mockReturnValue(now)
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        measureCallbacks.push(callback)
      }
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0)
  )
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id))
  vi.spyOn(window, "scrollBy").mockImplementation(() => {})
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  restoreDialog()
  measureCallbacks.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("AppLayout VMA integration", () => {
  it("opens the banner message without fetching and returns focus to its trigger on repeated use", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    mountLayout()
    const trigger = await screen.findByRole("button", { name: info.event })
    const live = screen.getByRole("alert").firstChild
    for (let index = 0; index < 2; index++) {
      trigger.focus()
      fireEvent.click(trigger)
      const dialog = screen.getByRole("dialog", { name: info.event })
      expect(document.activeElement).toBe(within(dialog).getByRole("heading", { level: 2 }))
      expect(dialog.textContent).toContain("Gå inomhus och stäng dörrar och fönster.")
      expect(screen.getByRole("main").contains(dialog)).toBe(false)
      expect(document.title).toBe("Hem | KrisKompassen")
      fireEvent.click(within(dialog).getByRole("button", { name: "Stäng" }))
      expect(screen.queryByRole("dialog")).toBe(null)
      expect(document.activeElement).toBe(trigger)
    }
    expect(screen.getByRole("alert").firstChild).toBe(live)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("keeps the selected message after expiry and returns to the page when the banner disappears", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    mountLayout()
    fireEvent.click(await screen.findByRole("button", { name: info.event }))
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(info.expires) + 1)
    fireEvent(document, new Event("visibilitychange"))
    await waitFor(() => expect(screen.queryByRole("complementary")).toBe(null))
    const dialog = screen.getByRole("dialog", { name: info.event })
    expect(within(dialog).getByRole("status").textContent).toContain("giltighetstid har gått ut")
    expect(dialog.textContent).toContain("Lyssna på lokal P4.")
    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng" }))
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not switch the open message when the banner selects a newer CAP ID", async () => {
    const newer = {
      ...alert,
      identifier: "newer-cap-id",
      sent: new Date(now + 60_000).toISOString(),
      info: [{ ...info, event: "Nyare varning", description: "En annan varning." }],
    }
    fetchMock.mockResolvedValue(Response.json(feed([alert, newer])))
    mountLayout()
    fireEvent.click(await screen.findByRole("button", { name: info.event }))
    vi.spyOn(Date, "now").mockReturnValue(now + 60_001)
    fireEvent(document, new Event("visibilitychange"))
    await screen.findByRole("button", { name: "Nyare varning" })
    expect(screen.getByRole("dialog", { name: info.event }).textContent).not.toContain(
      "En annan varning."
    )
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Stäng" }))
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("opens each listed message and returns focus to its list entry", async () => {
    fetchMock.mockResolvedValue(Response.json(feed(multipleAlerts)))
    mountLayout()
    await screen.findByText("3 aktiva VMA")
    fireEvent.click(screen.getByRole("button", { name: "Visa 2 fler VMA" }))
    for (const [title, text] of [
      [info.event, "Gå inomhus och stäng dörrar och fönster."],
      ["Gasläcka i Exempelstad", "Håll dig borta från hamnområdet."],
    ]) {
      const trigger = screen.getByRole("button", { name: title })
      trigger.focus()
      fireEvent.click(trigger)
      const dialog = screen.getByRole("dialog", { name: title })
      expect(dialog.textContent).toContain(text)
      fireEvent.click(within(dialog).getByRole("button", { name: "Stäng" }))
      expect(document.activeElement).toBe(trigger)
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("keeps an open listed message when it leaves the banner and returns focus to the page", async () => {
    const [newest, listed, update] = multipleAlerts
    const expiring = {
      ...listed,
      info: [{ ...listed.info[0], expires: new Date(now + 1_000).toISOString() }],
    }
    fetchMock.mockResolvedValue(Response.json(feed([newest, expiring, update])))
    mountLayout()
    fireEvent.click(await screen.findByRole("button", { name: "Visa 2 fler VMA" }))
    const trigger = screen.getByRole("button", { name: "Gasläcka i Exempelstad" })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Gasläcka i Exempelstad" })
    const dialogHeading = within(dialog).getByRole("heading", { level: 2 })
    expect(document.activeElement).toBe(dialogHeading)

    vi.spyOn(Date, "now").mockReturnValue(now + 1_001)
    fireEvent(document, new Event("visibilitychange"))
    await screen.findByText("2 aktiva VMA")
    expect(trigger.isConnected).toBe(false)
    expect(screen.getByRole("dialog", { name: "Gasläcka i Exempelstad" })).toBe(dialog)
    expect(dialog.textContent).toContain("Håll dig borta från hamnområdet.")
    expect(within(dialog).getByRole("status").textContent).toContain("giltighetstid har gått ut")
    expect(document.activeElement).toBe(dialogHeading)

    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng" }))
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("takes dialog validity from the copy the banner lists when a CAP ID repeats", async () => {
    const expiredCopy = { ...alert, info: [{ ...info, expires: new Date(now).toISOString() }] }
    const activeCopy = { ...alert, sent: new Date(now).toISOString() }
    fetchMock.mockResolvedValue(Response.json(feed([expiredCopy, activeCopy])))
    mountLayout()
    fireEvent.click(await screen.findByRole("button", { name: info.event }))
    const status = within(screen.getByRole("dialog", { name: info.event })).getByRole("status")
    expect(status.textContent).not.toContain("giltighetstid har gått ut")
    expect(status.textContent).toContain("VMA-informationen kan vara ofullständig.")
  })

  it("shows retained data with request diagnostics in the dialog after retry fails", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed([alert, null])))
    mountLayout()
    await screen.findByRole("button", { name: info.event })
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    fireEvent.click(screen.getByRole("button", { name: "Försök igen" }))
    await waitFor(() =>
      expect(within(screen.getByRole("complementary")).getByRole("status").textContent).toContain(
        "VMA-status kunde inte kontrolleras"
      )
    )
    fireEvent.click(screen.getByRole("button", { name: info.event }))
    const dialog = screen.getByRole("dialog")
    expect(dialog.textContent).toContain("Gå inomhus")
    expect(within(dialog).getByRole("status").textContent).toContain(
      "VMA-status kunde inte kontrolleras"
    )
    expect(within(dialog).getByRole("status").textContent).toContain("Senast kontrollerat")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it("preserves the same banner and request across routes while focusing the new page heading", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    mountLayout()
    const heading = await screen.findByRole("heading", { name: info.event })
    const announcement = screen.getByRole("alert").firstChild
    fireEvent.click(screen.getByRole("link", { name: "Krisinformation" }))
    const pageHeading = screen.getByRole("heading", { name: "Krisinformation" })
    expect(document.activeElement).toBe(pageHeading)
    expect(document.title).toBe("Krisinformation | KrisKompassen")
    expect(screen.getByRole("heading", { name: info.event })).toBe(heading)
    expect(screen.getByRole("alert").firstChild).toBe(announcement)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole("main")).toHaveLength(1)
    fireEvent.click(screen.getByRole("link", { name: "Hoppa till huvudinnehållet" }))
    expect(document.activeElement).toBe(screen.getByRole("main"))
  })

  it("retries a failed request and removes the notice after a successful empty response", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    mountLayout()
    const button = await screen.findByRole("button", { name: "Försök igen" })
    expect(within(screen.getByRole("complementary")).getByRole("status").textContent).toContain(
      "VMA-status kunde inte kontrolleras"
    )
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByRole("complementary")).toBe(null))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps the warning while keyboard mode changes update content and title on the same route", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    mountLayout()
    const warningHeading = await screen.findByRole("heading", { name: info.event })
    const announcement = screen.getByRole("alert").firstChild
    const online = screen.getByRole("radio", { name: "Online" })
    const offline = screen.getByRole("radio", { name: "Offline" })

    online.focus()
    fireEvent.keyDown(online, { key: "ArrowRight" })
    expect(offline.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(offline)
    expect(screen.getByRole("heading", { name: "Hem – offline" }).dataset.pathname).toBe("/")
    await waitFor(() => expect(document.title).toBe("Hem – offline | KrisKompassen"))
    expect(screen.getByRole("heading", { name: info.event })).toBe(warningHeading)
    expect(screen.getByRole("alert").firstChild).toBe(announcement)
    expect(screen.getByText("Ansluten")).toBeTruthy()

    fireEvent.keyDown(offline, { key: "ArrowLeft" })
    expect(online.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(online)
    expect(screen.getByRole("heading", { name: "Hem" }).dataset.pathname).toBe("/")
    await waitFor(() => expect(document.title).toBe("Hem | KrisKompassen"))
    expect(screen.getByRole("heading", { name: info.event })).toBe(warningHeading)
    expect(screen.getByRole("alert").firstChild).toBe(announcement)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("shows connection loss alongside a retained warning and keeps offline mode on recovery", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    mountLayout()
    const warningHeading = await screen.findByRole("heading", { name: info.event })
    const live = screen.getByRole("alert")
    const announcement = live.firstChild
    const online = screen.getByRole<HTMLButtonElement>("radio", { name: "Online" })
    const offline = screen.getByRole("radio", { name: "Offline" })

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    fireEvent(window, new Event("offline"))
    expect(screen.getByText("Ingen internetanslutning")).toBeTruthy()
    expect(
      screen.getByText("Internetanslutningen försvann, så du har växlats till offline-läge.")
    ).toBeTruthy()
    expect(offline.getAttribute("aria-checked")).toBe("true")
    expect(online.disabled).toBe(true)
    expect(screen.getByRole("heading", { name: info.event })).toBe(warningHeading)
    expect(live.firstChild).toBe(announcement)

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    fireEvent(window, new Event("online"))
    expect(screen.getByText("Ansluten")).toBeTruthy()
    expect(offline.getAttribute("aria-checked")).toBe("true")
    expect(online.disabled).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Stäng" }))
    expect(screen.getByRole("alert")).toBe(live)
    expect(live.firstChild).toBe(announcement)
    expect(screen.getByRole("heading", { name: info.event })).toBe(warningHeading)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("shows one valid message and an incomplete-data notice when a record is malformed", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([alert, null])))
    mountLayout()
    await screen.findByRole("heading", { name: info.event })
    expect(within(screen.getByRole("complementary")).getByRole("status").textContent).toContain(
      "VMA-informationen kan vara ofullständig"
    )
    expect(screen.getByRole("button", { name: "Försök igen" })).toBeTruthy()
  })

  it("reserves measured space and reveals keyboard focus beneath the sticky banner", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    const { unmount } = mountLayout()
    const notice = await screen.findByRole("complementary")
    const slot = notice.parentElement!
    vi.spyOn(slot, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 390, 120))
    for (const measure of measureCallbacks) measure()
    expect(document.documentElement.style.getPropertyValue("--vma-banner-height")).toBe("120px")
    const heading = screen.getByRole("heading", { name: "Hem" })
    vi.spyOn(heading, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 50, 100, 40))
    heading.focus()
    await waitFor(() =>
      expect(window.scrollBy).toHaveBeenCalledWith({ top: -78, behavior: "instant" })
    )
    unmount()
    expect(document.documentElement.style.getPropertyValue("--vma-banner-height")).toBe("")
    expect(document.documentElement.style.getPropertyValue("--navigation-height")).toBe("")
  })
})
