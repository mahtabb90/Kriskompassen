// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import { getCachedShelterById } from "../services/shelterStorageService"
import type { CachedShelter } from "../types/shelter"
import ShelterDetailPage from "./ShelterDetailPage"

vi.mock("../context/addressContext", () => ({
  useAddresses: vi.fn(),
}))

vi.mock("../services/shelterStorageService", () => ({
  getCachedShelterById: vi.fn(),
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

function renderDetail(id = fullShelter.id) {
  return render(
    <MemoryRouter initialEntries={[`/skyddsrum/${id}`]}>
      <Routes>
        <Route path="/skyddsrum/:id" element={<ShelterDetailPage />} />
        <Route path="/skyddsrum" element={<p>Listvy efter omdirigering</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockActiveAddress()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("ShelterDetailPage with full data", () => {
  it("renders every available field with a label, the map link and the general info block", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    expect(
      await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })
    ).toBeTruthy()
    expect(screen.getByText("Skyddsrumsnummer").nextElementSibling?.textContent).toBe("120599-3")
    expect(screen.getByText("Typ").nextElementSibling?.textContent).toBe("Skyddsrum")
    expect(screen.getByText("Kapacitet").nextElementSibling?.textContent).toContain("1")
    expect(screen.getByText("Kapacitet").nextElementSibling?.textContent).toContain("platser")
    expect(screen.getByText("Avstånd från din plats").nextElementSibling?.textContent).toMatch(
      /km|m$/
    )

    const mapLink = screen.getByRole("link", { name: /Visa skyddsrummet på kartan/ })
    expect(mapLink.getAttribute("href")).toContain("59.352")
    expect(mapLink.getAttribute("target")).toBe("_blank")
    expect(mapLink.getAttribute("rel")).toBe("noopener noreferrer")

    expect(screen.getByRole("heading", { name: "Om skyddsrum", level: 2 })).toBeTruthy()
    const sourceLink = screen.getByRole("link", { name: /Krisinformation.se/ })
    expect(sourceLink.getAttribute("href")).toBe(
      "https://www.krisinformation.se/forbered-dig/skyddsrum-utrymning-och-varningssystem/skyddsrum/"
    )
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
    expect(screen.getByRole("link", { name: /Visa skyddsrummet på kartan/ })).toBeTruthy()
  })

  it("hides distance when the user's position is unknown", async () => {
    mockActiveAddress({ lat: undefined, lon: undefined })
    vi.mocked(getCachedShelterById).mockResolvedValue(fullShelter)
    renderDetail()

    await screen.findByRole("heading", { name: "Kantarellen 11, Solna kommun" })
    expect(screen.queryByText("Avstånd från din plats")).toBeNull()
  })
})

describe("ShelterDetailPage not found", () => {
  it("redirects to the shelter list when the shelter was never cached locally", async () => {
    vi.mocked(getCachedShelterById).mockResolvedValue(undefined)
    renderDetail("never-cached")

    expect(await screen.findByText("Listvy efter omdirigering")).toBeTruthy()
  })
})
