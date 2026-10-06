// @vitest-environment jsdom
import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { alert, feed, info, now } from "../services/__fixtures__/vma"
import AppLayout from "./AppLayout"

let fetchMock = vi.fn<typeof fetch>()
const measureCallbacks: Array<() => void> = []

function Page({ title }: { title: string }) {
  return (
    <h1 id="page-heading" tabIndex={-1}>
      {title}
    </h1>
  )
}

function mountLayout() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Page title="Hem" />} />
            <Route path="crisis" element={<Page title="Krisinformation" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </StrictMode>
  )
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now)
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
