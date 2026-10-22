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
