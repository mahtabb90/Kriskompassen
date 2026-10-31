// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useNearestShelters } from "../hooks/useNearestShelters"
import { useSavedShelters } from "../hooks/useSavedShelters"
import type { GeoPoint } from "../utils/distance"
import ShelterMapPage from "./ShelterMapPage"

vi.mock("../context/addressContext", () => ({ useAddresses: vi.fn() }))
vi.mock("../context/modeContext", () => ({ useMode: vi.fn() }))
vi.mock("../hooks/useNearestShelters", () => ({ useNearestShelters: vi.fn() }))
vi.mock("../hooks/useSavedShelters", () => ({ useSavedShelters: vi.fn() }))

// The real MapLibre map is tested manually (see the ticket's own technical notes) - this mock
// exposes the props this test cares about through visible, queryable markup, same pattern as
// ShelterPage.test.tsx's ShelterMap mock.
vi.mock("../components/AllSheltersMap", () => ({
  default: ({
    origin,
    nearestShelters,
    savedShelterIds,
    initialView,
  }: {
    origin: GeoPoint | null
    nearestShelters: { id: string }[]
    savedShelterIds: ReadonlySet<string>
    initialView?: { center: GeoPoint; zoom: number }
  }) => (
    <div data-testid="all-shelters-map">
      <p>Ursprung: {origin ? `${origin.lat},${origin.lon}` : "inget"}</p>
      <p>Närmaste: {nearestShelters.map((shelter) => shelter.id).join(",")}</p>
      <p>Sparade: {Array.from(savedShelterIds).join(",")}</p>
      <p>
        Återställd vy:{" "}
        {initialView
          ? `${initialView.center.lat},${initialView.center.lon},${initialView.zoom}`
          : "ingen"}
      </p>
    </div>
  ),
}))

function renderPage(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/skyddsrum/karta", state }]}>
      <ShelterMapPage />
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

beforeEach(() => {
  mockMode("online")
  vi.mocked(useAddresses).mockReturnValue({
    activeAddress: { lat: 59.3, lon: 18.0, municipality: "Solna kommun" },
    loading: false,
  } as unknown as AddressContextValue)
  vi.mocked(useNearestShelters).mockReturnValue({
    state: { status: "ready", data: [{ id: "near-1" }] },
    retry: vi.fn(),
    updateData: vi.fn(),
  } as unknown as ReturnType<typeof useNearestShelters>)
  vi.mocked(useSavedShelters).mockReturnValue({
    shelters: [{ id: "saved-1", address: null, lat: 0, lon: 0, savedAt: "", comment: null }],
    loading: false,
    isSaved: () => false,
    save: vi.fn(),
    remove: vi.fn(),
    updateComment: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ShelterMapPage", () => {
  it("shows a link back to the nearest-shelters page", () => {
    renderPage()
    expect(
      screen.getByRole("link", { name: "Tillbaka till Skyddsrum i närheten" }).getAttribute("href")
    ).toBe("/skyddsrum")
  })

  it("shows an offline message instead of mounting the map when offline", () => {
    mockMode("offline")
    renderPage()

    expect(screen.getByText(/Kartan kräver internetanslutning/)).toBeTruthy()
    expect(screen.queryByTestId("all-shelters-map")).toBeNull()
  })

  it("mounts the map with the active address as origin and the nearest/saved ids when online", async () => {
    renderPage()

    expect(await screen.findByTestId("all-shelters-map")).toBeTruthy()
    expect(screen.getByText("Ursprung: 59.3,18")).toBeTruthy()
    expect(screen.getByText("Närmaste: near-1")).toBeTruthy()
    expect(screen.getByText("Sparade: saved-1")).toBeTruthy()
  })

  it("mounts the map without an origin when no active address is set", async () => {
    vi.mocked(useAddresses).mockReturnValue({
      activeAddress: null,
      loading: false,
    } as unknown as AddressContextValue)
    renderPage()

    expect(await screen.findByTestId("all-shelters-map")).toBeTruthy()
    expect(screen.getByText("Ursprung: inget")).toBeTruthy()
    expect(screen.getByText("Närmaste:")).toBeTruthy()
  })

  it("passes a mapView carried in navigation state through as the map's initial view", async () => {
    renderPage({ mapView: { center: { lat: 1, lon: 2 }, zoom: 9 } })

    expect(await screen.findByTestId("all-shelters-map")).toBeTruthy()
    expect(screen.getByText("Återställd vy: 1,2,9")).toBeTruthy()
  })

  it("has no view to restore when navigated to normally", async () => {
    renderPage()

    expect(await screen.findByTestId("all-shelters-map")).toBeTruthy()
    expect(screen.getByText("Återställd vy: ingen")).toBeTruthy()
  })

  it("shows a notice carried in navigation state, e.g. from a stale detail-page redirect", () => {
    renderPage({ notice: "Det skyddsrummet är inte sparat lokalt." })

    expect(screen.getByRole("alert").textContent).toBe("Det skyddsrummet är inte sparat lokalt.")
  })
})
