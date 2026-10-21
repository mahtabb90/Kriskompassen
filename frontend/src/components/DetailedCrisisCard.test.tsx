// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import { crisisItems, crisisResponse } from "../services/__fixtures__/crisis"
import { getOfflineItem, isSavedOffline, saveOffline } from "../services/offlineService"
import DetailedCrisisCard from "./DetailedCrisisCard"

vi.mock("../services/offlineService", () => ({
  getOfflineItem: vi.fn(),
  isSavedOffline: vi.fn(),
  saveOffline: vi.fn(),
  removeOffline: vi.fn(),
}))

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(async (input) => crisisResponse(input))
  )
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(isSavedOffline).mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("DetailedCrisisCard link semantics", () => {
  it("names the back link without its decorative arrow and announces the new-tab source link", async () => {
    const item = crisisItems[0]
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
    const source = await screen.findByRole("link", { name: /öppnas i ny flik/ })
    expect(source.getAttribute("href")).toBe(item.sourceUrl)
    expect(source.getAttribute("target")).toBe("_blank")
    expect(source.getAttribute("rel")).toBe("noopener noreferrer")
    expect(await screen.findByText("Inte sparad")).toBeTruthy()
  })
})

function mountDetail() {
  return render(
    <ModeProvider>
      <MemoryRouter initialEntries={[`/crisis/${crisisItems[0].id}`]}>
        <Link to={`/crisis/${crisisItems[1].id}`}>Nästa testartikel</Link>
        <Routes>
          <Route path="/crisis/:id" element={<DetailedCrisisCard />} />
          <Route path="/crisis" element={<p>Listvy efter omdirigering</p>} />
        </Routes>
      </MemoryRouter>
    </ModeProvider>
  )
}

describe("DetailedCrisisCard asynchronous content", () => {
  it("retains the heading node and focus when the article arrives", async () => {
    let finish!: (response: Response) => void
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    mountDetail()
    const heading = screen.getByRole("heading", { level: 1 })
    heading.focus()
    expect(screen.getByText("Hämtar krisinformation…")).toBeTruthy()
    await act(async () => finish(Response.json(crisisItems[0])))
    expect(await screen.findByRole("heading", { name: crisisItems[0].title })).toBe(heading)
    expect(document.activeElement).toBe(heading)
  })

  it("ignores the old article when responses arrive in reverse navigation order", async () => {
    const responses: Array<(response: Response) => void> = []
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => responses.push(resolve)))
    mountDetail()
    fireEvent.click(screen.getByRole("link", { name: "Nästa testartikel" }))
    await act(async () => responses[1](Response.json(crisisItems[1])))
    expect(await screen.findByRole("heading", { name: crisisItems[1].title })).toBeTruthy()
    await act(async () => responses[0](Response.json(crisisItems[0])))
    expect(screen.queryByRole("heading", { name: crisisItems[0].title })).toBeNull()
    expect(screen.getByRole("heading", { name: crisisItems[1].title })).toBeTruthy()
  })

  it.each([404, 500])("keeps an unrelated HTTP %i as a retryable error", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("<html>Fel</html>", { status }))
    mountDetail()
    const heading = screen.getByRole("heading", { level: 1 })
    expect(await screen.findByRole("button", { name: "Försök igen" })).toBeTruthy()
    expect(screen.queryByText("Listvy efter omdirigering")).toBeNull()
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading)
  })

  it("renders API markup as text", async () => {
    const content = "<script>window.example = true</script>\nAndra raden"
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...crisisItems[0], content }))
    mountDetail()
    await screen.findByRole("heading", { name: crisisItems[0].title })
    expect(screen.getByText(/<script>window.example/).textContent).toBe(content)
    expect(document.querySelector("script")).toBeNull()
  })

  it("reads an older offline copy without savedAt and hides an unsafe legacy source link", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const legacy = { ...crisisItems[0], savedOffline: true, sourceUrl: "javascript:alert(1)" }
    vi.mocked(getOfflineItem).mockResolvedValue(legacy)
    mountDetail()
    expect(await screen.findByText("Tidpunkt för sparande saknas")).toBeTruthy()
    expect(screen.queryByRole("link", { name: /öppnas i ny flik/ })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(saveOffline).not.toHaveBeenCalled()
  })

  it("retries an offline read failure without using the network", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    vi.mocked(getOfflineItem)
      .mockRejectedValueOnce(new Error("Storage unavailable"))
      .mockResolvedValueOnce({ ...crisisItems[0], savedOffline: true })
    mountDetail()
    const retry = await screen.findByRole("button", { name: "Försök igen" })
    fireEvent.click(retry)
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(crisisItems[0].title)
    )
    expect(getOfflineItem).toHaveBeenCalledTimes(2)
    expect(fetch).not.toHaveBeenCalled()
  })
})
