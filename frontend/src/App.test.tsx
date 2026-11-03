// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installDialogTestMethods } from "./components/__fixtures__/dialog"
import { apiConfig } from "./config/apiConfig"
import { crisisResponse } from "./services/__fixtures__/crisis"
import { feed } from "./services/__fixtures__/vma"
import { getSavedAddresses } from "./services/addressStorageService"
import type { SavedAddress } from "./types/address"
import App from "./App"

vi.mock("./services/addressStorageService", () => ({
  getSavedAddresses: vi.fn(),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

vi.mock("./services/offlineService", () => ({
  getOfflineItem: vi.fn().mockResolvedValue(undefined),
  getOfflineItems: vi.fn().mockResolvedValue([]),
  isSavedOffline: vi.fn().mockResolvedValue(false),
  saveOffline: vi.fn(),
  removeOffline: vi.fn(),
}))

vi.mock("./services/crisisKitService", () => ({
  getCrisisKitItems: vi.fn().mockResolvedValue([]),
}))

vi.mock("./services/shelterStorageService", () => ({
  getSavedShelters: vi.fn().mockResolvedValue([]),
  getAllCachedShelters: vi.fn().mockResolvedValue([]),
  getCachedShelterById: vi.fn().mockResolvedValue(undefined),
  cacheShelters: vi.fn(),
  saveShelter: vi.fn(),
  removeSavedShelter: vi.fn(),
  setSavedShelterComment: vi.fn(),
}))

// Routing uses the real pages; only the WebGL map is replaced because jsdom has no canvas.
vi.mock("./components/AllSheltersMap", () => ({
  default: () => <div data-testid="shelter-map" />,
}))

const startingPages = [
  ["/", "Din kompass i en kris"],
  ["/crisis", "Innan krisen"],
  ["/crisis-kit", "Min krislåda"],
  ["/skyddsrum", "Skyddsrum"],
  ["/skyddsrum/karta", "Kartan"],
  ["/lugn-i-kris", "Lugn i kris"],
] as const

const home: SavedAddress = {
  id: "home",
  text: "Hemgatan 1",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-13T00:00:00.000Z",
}

let desktop = true
let restoreDialog: () => void
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView"
)

beforeEach(() => {
  desktop = true
  restoreDialog = installDialogTestMethods()
  vi.mocked(getSavedAddresses).mockResolvedValue([])
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 48rem)" && desktop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal(
    "fetch",
    vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        input === apiConfig.vmaUrl ? Response.json(feed([])) : crisisResponse(input)
      )
  )
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  })
  vi.spyOn(window, "scrollBy").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  restoreDialog()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView)
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView")
  }
  window.history.replaceState(null, "", "/")
})

function mountApp(path = "/") {
  window.history.replaceState(null, "", path)
  return render(<App />)
}

async function expectSettings(navigated = true) {
  const heading = await screen.findByRole("heading", { level: 1, name: "Inställningar" })
  await waitFor(() => expect(document.title).toBe("Inställningar | KrisKompassen"))
  expect(window.location.pathname).toBe("/installningar")
  expect(heading.id).toBe("page-heading")
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
  expect(
    within(navigation).getByRole("link", { name: "Inställningar" }).getAttribute("aria-current")
  ).toBe("page")
  if (navigated) expect(document.activeElement).toBe(heading)
}

describe("settings navigation through the app router", () => {
  it.each(startingPages)("opens settings from the desktop menu on %s", async (path, title) => {
    mountApp(path)
    await screen.findByRole("heading", { level: 1, name: title })
    const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })

    fireEvent.click(within(navigation).getByRole("link", { name: "Inställningar" }))

    await expectSettings()
  })

  it.each(startingPages)("opens settings from the mobile menu on %s", async (path, title) => {
    desktop = false
    mountApp(path)
    await screen.findByRole("heading", { level: 1, name: title })
    const trigger = screen.getByRole("button", { name: "Meny" })
    fireEvent.click(trigger)
    const dialog = screen.getByRole("dialog", { name: "Meny" })

    fireEvent.click(within(dialog).getByRole("link", { name: "Inställningar" }))

    await expectSettings()
    expect(screen.queryByRole("dialog", { name: "Meny" })).toBeNull()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
  })

  it("opens settings from the home feature card", async () => {
    mountApp()
    const main = screen.getByRole("main")

    fireEvent.click(within(main).getByRole("link", { name: "Inställningar" }))

    await expectSettings()
  })

  it("opens settings from the active-address link on the map page", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    mountApp("/skyddsrum/karta")
    const header = screen.getByRole("banner")

    fireEvent.click(await within(header).findByRole("link", { name: "Hemgatan 1" }))

    await expectSettings()
    expect(within(screen.getByRole("main")).getByText("Hemgatan 1")).toBeTruthy()
  })

  it.each([
    ["Ange din plats", []],
    ["Ange din plats igen", [home]],
  ] as const)("opens settings from the shelter page's %s link", async (name, addresses) => {
    vi.mocked(getSavedAddresses).mockResolvedValue([...addresses])
    mountApp("/skyddsrum")

    fireEvent.click(await screen.findByRole("link", { name }))

    await expectSettings()
  })

  it("opens the settings route directly and after remounting at the same address", async () => {
    const firstVisit = mountApp("/installningar")
    await expectSettings(false)
    firstVisit.unmount()

    render(<App />)

    await expectSettings(false)
    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
  })

  it("shows the not-found page for the removed /min-info address without redirecting", async () => {
    mountApp("/min-info")

    await screen.findByRole("heading", { level: 1, name: "Sidan kunde inte hittas" })
    expect(window.location.pathname).toBe("/min-info")
    expect(screen.queryByRole("heading", { level: 1, name: "Inställningar" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Min info" })).toBeNull()
  })

  it("restores the page and its focused heading through browser back and forward", async () => {
    mountApp()
    const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
    fireEvent.click(within(navigation).getByRole("link", { name: "Inställningar" }))
    await expectSettings()

    act(() => window.history.back())
    const homeHeading = await screen.findByRole("heading", {
      level: 1,
      name: "Din kompass i en kris",
    })
    expect(window.location.pathname).toBe("/")
    expect(document.activeElement).toBe(homeHeading)

    act(() => window.history.forward())

    await expectSettings()
  })

  it("keeps settings reachable through the mobile menu while offline", async () => {
    desktop = false
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    mountApp("/skyddsrum/karta")
    expect(screen.getByText("Kartan kräver internetanslutning.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Meny" }))
    const dialog = screen.getByRole("dialog", { name: "Meny" })

    fireEvent.click(within(dialog).getByRole("link", { name: "Inställningar" }))

    await expectSettings()
    expect(screen.queryByRole("dialog", { name: "Meny" })).toBeNull()
    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })
})

const krisinfoPages = [
  ["/krisinformation", "Krisinformation"],
  ["/crisis", "Innan krisen"],
  ["/telefonnummer", "Viktiga telefonnummer"],
  ["/varningssignaler", "Utomhusvarning"],
  ["/lugn-i-kris", "Lugn i kris"],
] as const

const overviewParts = [
  ["Innan krisen", "/crisis", "Innan krisen"],
  ["Telefonnummer", "/telefonnummer", "Viktiga telefonnummer"],
  ["Utomhusvarning", "/varningssignaler", "Utomhusvarning"],
  ["Lugn i kris", "/lugn-i-kris", "Lugn i kris"],
] as const

function expectOnlyKrisinformationCurrent(container: HTMLElement) {
  const current = within(container)
    .getAllByRole("link")
    .filter((link) => link.hasAttribute("aria-current"))
  expect(current).toHaveLength(1)
  expect(current[0].textContent).toContain("Krisinformation")
  expect(current[0].getAttribute("aria-current")).toBe("page")
}

async function expectPage(path: string, title: string, navigated = true) {
  const heading = await screen.findByRole("heading", { level: 1, name: title })
  await waitFor(() => expect(document.title).toBe(`${title} | KrisKompassen`))
  expect(window.location.pathname).toBe(path)
  expect(heading.id).toBe("page-heading")
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  if (navigated) expect(document.activeElement).toBe(heading)
  return heading
}

describe("krisinfo overview and its parts through the app router", () => {
  it.each(krisinfoPages)("opens %s directly with its heading and title", async (path, title) => {
    mountApp(path)

    await expectPage(path, title, false)
    expectOnlyKrisinformationCurrent(screen.getByRole("navigation", { name: "Huvudnavigation" }))
  })

  it.each(krisinfoPages.slice(1))("links %s back to the overview", async (path, title) => {
    mountApp(path)
    await expectPage(path, title, false)

    fireEvent.click(screen.getByRole("link", { name: "Tillbaka till krisinformation" }))

    await expectPage("/krisinformation", "Krisinformation")
  })

  it("goes from the home card to the overview, into every part and back", async () => {
    mountApp()
    fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: "Krisinformation" }))
    await expectPage("/krisinformation", "Krisinformation")

    for (const [card, path, title] of overviewParts) {
      fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: card }))
      await expectPage(path, title)
      expectOnlyKrisinformationCurrent(screen.getByRole("navigation", { name: "Huvudnavigation" }))

      fireEvent.click(screen.getByRole("link", { name: "Tillbaka till krisinformation" }))
      await expectPage("/krisinformation", "Krisinformation")
    }
  })

  it("opens the overview from the home page's call to action", async () => {
    mountApp()

    fireEvent.click(screen.getByRole("link", { name: "Se krisinformation" }))

    await expectPage("/krisinformation", "Krisinformation")
  })

  it("leads from an article back to Innan krisen with Krisinformation still current", async () => {
    mountApp("/crisis/food-in-crisis")
    await expectPage("/crisis/food-in-crisis", "Mat i kris", false)
    expectOnlyKrisinformationCurrent(screen.getByRole("navigation", { name: "Huvudnavigation" }))

    fireEvent.click(screen.getByRole("link", { name: "Tillbaka till Innan krisen" }))

    await expectPage("/crisis", "Innan krisen")
  })

  it("offers Lugn i kris only through the overview, not in the menus or on the home page", async () => {
    mountApp()
    await expectPage("/", "Din kompass i en kris", false)
    const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
    expect(within(navigation).queryByRole("link", { name: "Lugn i kris" })).toBeNull()
    expect(within(screen.getByRole("main")).queryByRole("link", { name: "Lugn i kris" })).toBeNull()

    desktop = false
    cleanup()
    mountApp("/lugn-i-kris")
    await expectPage("/lugn-i-kris", "Lugn i kris", false)
    fireEvent.click(screen.getByRole("button", { name: "Meny" }))
    const dialog = screen.getByRole("dialog", { name: "Meny" })
    expect(within(dialog).queryByRole("link", { name: "Lugn i kris" })).toBeNull()
    expectOnlyKrisinformationCurrent(dialog)

    fireEvent.click(within(dialog).getByRole("link", { name: "Krisinformation" }))

    await expectPage("/krisinformation", "Krisinformation")
    expect(screen.queryByRole("dialog", { name: "Meny" })).toBeNull()
  })

  it("shows the not-found page's krisinfo link leading to the overview", async () => {
    mountApp("/no-such-page")
    await screen.findByRole("heading", { level: 1, name: "Sidan kunde inte hittas" })

    fireEvent.click(screen.getByRole("link", { name: "Visa krisinformation" }))

    await expectPage("/krisinformation", "Krisinformation")
  })

  it("moves between the overview and the static parts while offline without fetching", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    mountApp("/krisinformation")
    await expectPage("/krisinformation", "Krisinformation", false)

    for (const [card, path, title] of overviewParts.slice(1)) {
      fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: card }))
      await expectPage(path, title)
      fireEvent.click(screen.getByRole("link", { name: "Tillbaka till krisinformation" }))
      await expectPage("/krisinformation", "Krisinformation")
    }
    expect(fetch).not.toHaveBeenCalled()
  })
})
