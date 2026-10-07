// @vitest-environment jsdom
import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import { useMode } from "../context/modeContext"
import { alert, feed, info, now } from "../services/__fixtures__/vma"
import AppLayout from "./AppLayout"

let fetchMock = vi.fn<typeof fetch>()
const measureCallbacks: Array<() => void> = []

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
        <MemoryRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Page title="Hem" />} />
              <Route path="crisis" element={<Page title="Krisinformation" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ModeProvider>
    </StrictMode>
  )
}

beforeEach(() => {
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
  measureCallbacks.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("AppLayout VMA integration", () => {
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
    expect(screen.getByRole("status").textContent).toContain("VMA-status kunde inte kontrolleras")
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
    expect(screen.getByRole("status").textContent).toContain(
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
