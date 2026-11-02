// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import {
  getCachedShelterById,
  getSavedShelters,
  removeSavedShelter,
  saveShelter,
  setSavedShelterComment,
} from "../services/shelterStorageService"
import type { CachedShelter } from "../types/shelter"
import ShelterDetailPage from "./ShelterDetailPage"

vi.mock("../context/addressContext", () => ({
  useAddresses: vi.fn(),
}))

vi.mock("../context/modeContext", () => ({
  useMode: vi.fn(),
}))

vi.mock("../services/shelterStorageService", () => ({
  getCachedShelterById: vi.fn(),
  getSavedShelters: vi.fn(),
  saveShelter: vi.fn(),
  removeSavedShelter: vi.fn(),
  setSavedShelterComment: vi.fn(),
}))

// The real MapLibre map is verified manually, not here - this just confirms the embedded map
// mounts (or doesn't, offline) correctly.
vi.mock("../components/ShelterLocationMap", () => ({
  default: () => <div data-testid="shelter-location-map" />,
}))

const fullShelter: CachedShelter = {
  id: "a0f314b8-0532-4783-a949-df9ff4a9d73d",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 1200,
  type: "Skyddsrum",
  fetchedAt: "2026-01-01T00:00:00Z",
}

function mockActiveAddress(
  overrides: Partial<{ lat: number; lon: number; municipality: string }> = {}
) {
  vi.mocked(useAddresses).mockReturnValue({
    activeAddress: {
      id: "addr-1",
      text: "Hemma",
      source: "manual",
      approximate: false,
      label: { kind: "hem" },
      isActive: true,
      savedAt: "2026-01-01T00:00:00Z",
      lat: 59.3,
      lon: 18.0,
      municipality: "Solna kommun",
      ...overrides,
    },
    loading: false,
    // Only the fields the page reads are provided by this test double.
  } as unknown as AddressContextValue)
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

function renderDetail(id = fullShelter.id, state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/skyddsrum/${id}`, state }]}>
      <Routes>
        <Route path="/skyddsrum/:id" element={<ShelterDetailPage />} />
        <Route path="/skyddsrum" element={<p>Listvy efter omdirigering</p>} />
        <Route path="/skyddsrum/karta" element={<p>Kartan efter omdirigering</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockActiveAddress()
  mockMode("online")
  vi.mocked(getSavedShelters).mockResolvedValue([])
  vi.mocked(saveShelter).mockResolvedValue(undefined)
  vi.mocked(removeSavedShelter).mockResolvedValue(undefined)
  vi.mocked(setSavedShelterComment).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ShelterDetailPage with full data", () => {
  it("renders every available field with a label, the embedded map and the general info block", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    expect(
      await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })
    ).toBeTruthy()
    expect(screen.getByText("Skyddsrumsnummer").nextElementSibling?.textContent).toBe("120599-3")
    expect(screen.getByText("Typ").nextElementSibling?.textContent).toBe("Skyddsrum")
    expect(screen.getByText("Kapacitet").nextElementSibling?.textContent).toContain("1")
    expect(screen.getByText("Kapacitet").nextElementSibling?.textContent).toContain("platser")
    const distanceField = screen.getByText("Avstånd från din plats").nextElementSibling
    expect(distanceField?.textContent).toMatch(/\(fågelvägen\)/)
    expect(distanceField?.textContent).toMatch(/(meter|kilometer) fågelvägen/)

    expect(await screen.findByTestId("shelter-location-map")).toBeTruthy()

    expect(screen.getByRole("heading", { name: "Om skyddsrum", level: 2 })).toBeTruthy()
    const sourceLink = screen.getByRole("link", { name: /Krisinformation.se/ })
    expect(sourceLink.getAttribute("href")).toBe(
      "https://www.krisinformation.se/forbered-dig/skyddsrum-utrymning-och-varningssystem/skyddsrum/"
    )
  })
})

describe("ShelterDetailPage map", () => {
  it("shows an offline notice instead of the map when offline, without mounting it", async () => {
    mockMode("offline")
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })
    expect(screen.getByText(/Kartan kräver internetanslutning/)).toBeTruthy()
    expect(screen.queryByTestId("shelter-location-map")).toBeNull()
  })
})

describe("ShelterDetailPage with missing fields", () => {
  it("hides fields absent from the source data instead of showing them empty", async () => {
    const sparse: CachedShelter = {
      id: "sparse-1",
      number: null,
      address: null,
      lat: 59.352,
      lon: 18.152,
      capacity: null,
      type: null,
      fetchedAt: "2026-01-01T00:00:00Z",
    }
    vi.mocked(getCachedShelterById).mockResolvedValue(sparse)
    renderDetail("sparse-1")

    expect(await screen.findByRole("heading", { name: "Nära Solna kommun" })).toBeTruthy()
    expect(screen.queryByText("Skyddsrumsnummer")).toBeNull()
    expect(screen.queryByText("Typ")).toBeNull()
    expect(screen.queryByText("Kapacitet")).toBeNull()
    expect(screen.getByText("Plats")).toBeTruthy()
    expect(await screen.findByTestId("shelter-location-map")).toBeTruthy()
  })

  it("hides distance when the user's position is unknown", async () => {
    mockActiveAddress({ lat: undefined, lon: undefined })
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })
    expect(screen.queryByText("Avstånd från din plats")).toBeNull()
  })
})

describe("ShelterDetailPage save button", () => {
  it("saves an unsaved shelter and flips to the saved state", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()
    await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })

    expect(screen.getByText("Inte sparat")).toBeTruthy()
    const saveButton = screen.getByRole("button", { name: "Spara skyddsrum" })

    vi.mocked(getSavedShelters).mockResolvedValue([
      {
        id: fullShelter.id,
        address: fullShelter.address,
        lat: fullShelter.lat,
        lon: fullShelter.lon,
        savedAt: "2026-01-01T00:00:00Z",
        comment: null,
      },
    ])
    fireEvent.click(saveButton)

    expect(saveShelter).toHaveBeenCalledExactlyOnceWith(fullShelter)
    expect(await screen.findByText("Sparat skyddsrum")).toBeTruthy()
    expect(await screen.findByRole("button", { name: "Ta bort sparat skyddsrum" })).toBeTruthy()
  })

  it("removes an already-saved shelter", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    vi.mocked(getSavedShelters).mockResolvedValue([
      {
        id: fullShelter.id,
        address: fullShelter.address,
        lat: fullShelter.lat,
        lon: fullShelter.lon,
        savedAt: "2026-01-01T00:00:00Z",
        comment: null,
      },
    ])
    renderDetail()

    await screen.findByText("Sparat skyddsrum")
    const saveButton = screen.getByRole("button", { name: "Ta bort sparat skyddsrum" })

    vi.mocked(getSavedShelters).mockResolvedValue([])
    fireEvent.click(saveButton)

    expect(removeSavedShelter).toHaveBeenCalledExactlyOnceWith(fullShelter.id)
    expect(await screen.findByRole("button", { name: "Spara skyddsrum" })).toBeTruthy()
  })
})

describe("ShelterDetailPage comment", () => {
  it("hides the comment field when the shelter is not saved", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()
    await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })

    expect(screen.queryByLabelText(/Kommentar/)).toBeNull()
  })

  it("shows the comment field, prefilled, once the shelter is saved", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    vi.mocked(getSavedShelters).mockResolvedValue([
      {
        id: fullShelter.id,
        address: fullShelter.address,
        lat: fullShelter.lat,
        lon: fullShelter.lon,
        savedAt: "2026-01-01T00:00:00Z",
        comment: "Kommunhuset",
      },
    ])
    renderDetail()

    const input = await screen.findByLabelText<HTMLInputElement>(/Kommentar/)
    expect(input.value).toBe("Kommunhuset")
  })

  it("persists an edited comment on blur", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    vi.mocked(getSavedShelters).mockResolvedValue([
      {
        id: fullShelter.id,
        address: fullShelter.address,
        lat: fullShelter.lat,
        lon: fullShelter.lon,
        savedAt: "2026-01-01T00:00:00Z",
        comment: null,
      },
    ])
    renderDetail()

    const input = await screen.findByLabelText<HTMLInputElement>(/Kommentar/)
    fireEvent.change(input, { target: { value: "Kommunhuset" } })
    fireEvent.blur(input)

    expect(setSavedShelterComment).toHaveBeenCalledExactlyOnceWith(fullShelter.id, "Kommunhuset")
  })

  it("shows a confirmation after a successful save, and clears it while editing again", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    vi.mocked(getSavedShelters).mockResolvedValue([
      {
        id: fullShelter.id,
        address: fullShelter.address,
        lat: fullShelter.lat,
        lon: fullShelter.lon,
        savedAt: "2026-01-01T00:00:00Z",
        comment: null,
      },
    ])
    renderDetail()

    const input = await screen.findByLabelText<HTMLInputElement>(/Kommentar/)
    expect(screen.queryByText("Kommentar sparad.")).toBeNull()

    fireEvent.change(input, { target: { value: "Kommunhuset" } })
    fireEvent.blur(input)
    expect(await screen.findByText("Kommentar sparad.")).toBeTruthy()

    fireEvent.change(input, { target: { value: "Kommunhuset, källaren" } })
    expect(screen.queryByText("Kommentar sparad.")).toBeNull()
  })
})

describe("ShelterDetailPage not found", () => {
  it("redirects to the shelter list when the shelter was never cached locally", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(undefined)
    renderDetail("never-cached")

    expect(await screen.findByText("Listvy efter omdirigering")).toBeTruthy()
  })

  it("redirects to the map, not the list, when it carries the map's view", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(undefined)
    renderDetail("never-cached", { mapView: { center: { lat: 59.3, lon: 18.0 }, zoom: 10 } })

    expect(await screen.findByText("Kartan efter omdirigering")).toBeTruthy()
  })
})

describe("ShelterDetailPage back link", () => {
  it("links back to the nearest-shelters list by default", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    const backLink = await screen.findByRole("link", { name: /Tillbaka till skyddsrum i närheten/ })
    expect(backLink.getAttribute("href")).toBe("/skyddsrum")
  })

  it("links back to the map, carrying the same view, when arriving from there", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail(fullShelter.id, { mapView: { center: { lat: 59.3, lon: 18.0 }, zoom: 10 } })

    const backLink = await screen.findByRole("link", { name: /Tillbaka till kartan/ })
    expect(backLink.getAttribute("href")).toBe("/skyddsrum/karta")
  })
})
