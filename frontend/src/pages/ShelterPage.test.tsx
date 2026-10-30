// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useNearestShelters } from "../hooks/useNearestShelters"
import { useSavedShelters } from "../hooks/useSavedShelters"
import { getAllCachedShelters } from "../services/shelterStorageService"
import type { NearestShelter } from "../hooks/useNearestShelters"
import ShelterPage from "./ShelterPage"

vi.mock("../context/addressContext", () => ({
  useAddresses: vi.fn(),
}))

vi.mock("../context/modeContext", () => ({
  useMode: vi.fn(),
}))

vi.mock("../hooks/useNearestShelters", () => ({
  useNearestShelters: vi.fn(),
}))

vi.mock("../hooks/useSavedShelters", () => ({
  useSavedShelters: vi.fn(),
}))

vi.mock("../services/shelterStorageService", () => ({
  getAllCachedShelters: vi.fn(),
}))

// The real Leaflet map is tested manually, not here (see the ticket's own technical notes) -
// this mock lets the surrounding view-toggle/selection-sync logic be tested without rendering
// Leaflet in jsdom. Exposes the props this test cares about through visible, queryable markup.
vi.mock("../components/ShelterMap", () => ({
  default: ({
    shelters,
    selectedId,
    onSelect,
  }: {
    shelters: NearestShelter[]
    selectedId: string | null
    onSelect: (id: string) => void
  }) => (
    <div data-testid="shelter-map">
      <p>Markörer: {shelters.map((shelter) => shelter.id).join(",")}</p>
      <p>Valt: {selectedId ?? "inget"}</p>
      {shelters.map((shelter) => (
        <button key={shelter.id} type="button" onClick={() => onSelect(shelter.id)}>
          Markera {shelter.id} på kartan
        </button>
      ))}
    </div>
  ),
}))

const nearestShelter: NearestShelter = {
  id: "near-1",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 1200,
  type: "Skyddsrum",
  distanceMeters: 350,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ShelterPage />
    </MemoryRouter>
  )
}

function mockMode(mode: "online" | "offline") {
  vi.mocked(useMode).mockReturnValue({
    mode,
    isOnline: mode === "online",
    autoSwitchNotice: null,
    setMode: vi.fn(),
    dismissAutoSwitchNotice: vi.fn(),
  })
}

function mockSavedShelters(shelters: ReturnType<typeof useSavedShelters>["shelters"] = []) {
  vi.mocked(useSavedShelters).mockReturnValue({
    shelters,
    loading: false,
    isSaved: (id: string) => shelters.some((shelter) => shelter.id === id),
    save: vi.fn(),
    remove: vi.fn(),
    updateComment: vi.fn(),
  })
}

beforeEach(() => {
  vi.mocked(useAddresses).mockReturnValue({
    activeAddress: { lat: 59.3, lon: 18.0, municipality: "Solna kommun" },
    loading: false,
  } as unknown as AddressContextValue)
  mockMode("online")
  vi.mocked(useNearestShelters).mockReturnValue({
    state: { status: "ready", data: [nearestShelter] },
    retry: vi.fn(),
    updateData: vi.fn(),
  })
  mockSavedShelters()
  vi.mocked(getAllCachedShelters).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ShelterPage tabs", () => {
  it("shows the nearest-shelters tab selected by default", () => {
    renderPage()

    expect(
      screen.getByRole("tab", { name: "Skyddsrum i närheten" }).getAttribute("aria-selected")
    ).toBe("true")
    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("false")
    expect(screen.getByText("Kantarellen 11, Solna kommun")).toBeTruthy()
  })

  it("switches to the saved-shelters panel when that tab is clicked", () => {
    mockSavedShelters([
      {
        id: "near-1",
        address: "Kantarellen 11",
        lat: 59.352,
        lon: 18.152,
        savedAt: "2026-01-01T00:00:00Z",
        comment: null,
      },
    ])
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Sparade skyddsrum" }))

    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("true")
    expect(
      screen.queryByRole("list", {
        name: "Närmaste skyddsrum, sorterat efter avstånd, närmast först",
      })
    ).toBeNull()
    expect(screen.getByRole("list", { name: "Sparade skyddsrum" })).toBeTruthy()
  })

  it("shows an empty-state message on the saved tab when nothing is bookmarked", () => {
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Sparade skyddsrum" }))

    expect(screen.getByText(/Inga skyddsrum sparade än/)).toBeTruthy()
  })
})

describe("ShelterPage om-skyddsrum filler card", () => {
  it("shows the general shelter info card when the nearest-shelters count is odd", () => {
    renderPage()

    expect(screen.getByRole("heading", { name: "Om skyddsrum", level: 2 })).toBeTruthy()
  })

  it("hides the general shelter info card when the nearest-shelters count is even", () => {
    vi.mocked(useNearestShelters).mockReturnValue({
      state: {
        status: "ready",
        data: [nearestShelter, { ...nearestShelter, id: "near-2" }],
      },
      retry: vi.fn(),
      updateData: vi.fn(),
    })
    renderPage()

    expect(screen.queryByRole("heading", { name: "Om skyddsrum", level: 2 })).toBeNull()
  })
})

describe("ShelterPage comment", () => {
  it("shows a saved shelter's comment on its card in the nearest-shelters tab too", () => {
    mockSavedShelters([
      {
        id: "near-1",
        address: "Kantarellen 11",
        lat: 59.352,
        lon: 18.152,
        savedAt: "2026-01-01T00:00:00Z",
        comment: "Kommunhuset",
      },
    ])
    renderPage()

    expect(
      screen.getByRole("tab", { name: "Skyddsrum i närheten" }).getAttribute("aria-selected")
    ).toBe("true")
    expect(screen.getByText("Kommunhuset")).toBeTruthy()
  })
})

describe("ShelterPage mode-driven tab", () => {
  it("defaults to the saved tab when already in offline mode on mount", () => {
    mockMode("offline")
    renderPage()

    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("true")
  })

  it("switches to the saved tab when the mode toggles to offline", () => {
    const { rerender } = renderPage()
    expect(
      screen.getByRole("tab", { name: "Skyddsrum i närheten" }).getAttribute("aria-selected")
    ).toBe("true")

    mockMode("offline")
    rerender(
      <MemoryRouter>
        <ShelterPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("true")
  })

  it("switches back to the nearest tab when the mode returns to online", () => {
    mockMode("offline")
    const { rerender } = renderPage()
    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("true")

    mockMode("online")
    rerender(
      <MemoryRouter>
        <ShelterPage />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("tab", { name: "Skyddsrum i närheten" }).getAttribute("aria-selected")
    ).toBe("true")
  })

  it("still lets the user manually switch tabs within the current mode", () => {
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Sparade skyddsrum" }))

    expect(
      screen.getByRole("tab", { name: "Sparade skyddsrum" }).getAttribute("aria-selected")
    ).toBe("true")
  })
})

describe("ShelterPage list/map view toggle", () => {
  it("shows the list view selected by default", () => {
    renderPage()

    expect(screen.getByRole("tab", { name: "Lista" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tab", { name: "Karta" }).getAttribute("aria-selected")).toBe("false")
    expect(screen.queryByTestId("shelter-map")).toBeNull()
  })

  it("switches to the map view when that tab is clicked", async () => {
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Karta" }))

    expect(await screen.findByTestId("shelter-map")).toBeTruthy()
    expect(screen.getByText(`Markörer: ${nearestShelter.id}`)).toBeTruthy()
  })

  it("syncs a list-item selection to the map", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("tab", { name: "Karta" }))
    await screen.findByTestId("shelter-map")
    expect(screen.getByText("Valt: inget")).toBeTruthy()

    fireEvent.click(screen.getByRole("tab", { name: "Lista" }))
    fireEvent.click(screen.getByText("Kantarellen 11, Solna kommun"))
    fireEvent.click(screen.getByRole("tab", { name: "Karta" }))

    expect(await screen.findByText(`Valt: ${nearestShelter.id}`)).toBeTruthy()
  })

  it("syncs a map-marker selection back to the list's highlighted card", async () => {
    renderPage()
    fireEvent.click(screen.getByRole("tab", { name: "Karta" }))
    await screen.findByTestId("shelter-map")

    fireEvent.click(screen.getByRole("button", { name: `Markera ${nearestShelter.id} på kartan` }))

    expect(screen.getByText(`Valt: ${nearestShelter.id}`)).toBeTruthy()
  })

  it("marks the first shelter as nearest in the list", () => {
    renderPage()

    expect(screen.getByText("Närmast")).toBeTruthy()
  })

  it("disables the map tab and shows the offline notice when offline", () => {
    mockMode("offline")
    renderPage()

    fireEvent.click(screen.getByRole("tab", { name: "Sparade skyddsrum" }))
    fireEvent.click(screen.getByRole("tab", { name: "Skyddsrum i närheten" }))

    expect(screen.getByRole("tab", { name: "Karta" }).getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByText(/Kartan kräver internetanslutning/)).toBeTruthy()
  })

  it("unmounts the map and returns to the list when the mode switches to offline mid-session", async () => {
    const { rerender } = renderPage()
    fireEvent.click(screen.getByRole("tab", { name: "Karta" }))
    await screen.findByTestId("shelter-map")

    mockMode("offline")
    rerender(
      <MemoryRouter>
        <ShelterPage />
      </MemoryRouter>
    )
    // Going offline switches ShelterPage's own outer tab to "Sparade skyddsrum" (see "ShelterPage
    // mode-driven tab" above), which unmounts the nearest-shelters panel - and the map with it -
    // entirely. Navigating back to "Skyddsrum i närheten" (allowed even while offline, reading
    // from the device cache) remounts it fresh, defaulting to the list again.
    expect(screen.queryByTestId("shelter-map")).toBeNull()
    fireEvent.click(screen.getByRole("tab", { name: "Skyddsrum i närheten" }))

    expect(screen.getByRole("tab", { name: "Lista" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.queryByTestId("shelter-map")).toBeNull()
  })
})
