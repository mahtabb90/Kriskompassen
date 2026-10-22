// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import type { NearestShelter } from "../hooks/useNearestShelters"
import ShelterListItem from "./ShelterListItem"

vi.mock("../context/addressContext", () => ({
  useAddresses: vi.fn(),
}))

function mockActiveAddress(municipality: string | null = "Solna kommun") {
  // Only the field the component reads is provided by this test double.
  vi.mocked(useAddresses).mockReturnValue({
    activeAddress: { municipality },
  } as unknown as AddressContextValue)
}

const fullShelter: NearestShelter = {
  id: "a0f314b8-0532-4783-a949-df9ff4a9d73d",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 1200,
  type: "Skyddsrum",
  distanceMeters: 350,
}

function renderItem(shelter: NearestShelter) {
  return render(
    <MemoryRouter>
      <ul>
        <ShelterListItem shelter={shelter} />
      </ul>
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

describe("ShelterListItem with full data", () => {
  it("renders distance, number, type, capacity and both links", () => {
    renderItem(fullShelter)

    expect(screen.getByText("Kantarellen 11, Solna kommun")).toBeTruthy()
    expect(screen.getByText("Skyddsrumsnummer 120599-3")).toBeTruthy()
    expect(screen.getByText("350 m (fågelvägen)").getAttribute("aria-hidden")).toBe("true")
    expect(screen.getByText("350 meter fågelvägen")).toBeTruthy()
    const otherDetails = screen.getByText(/platser/)
    expect(otherDetails.textContent).toContain("Skyddsrum")

    const detailLink = screen.getByRole("link", { name: "Visa detaljer" })
    expect(detailLink.getAttribute("href")).toBe(`/skyddsrum/${fullShelter.id}`)

    const mapLink = screen.getByRole("link", { name: /Visa på karta/ })
    expect(mapLink.getAttribute("target")).toBe("_blank")
  })
})

describe("ShelterListItem with missing fields", () => {
  it("hides fields absent from the source data but always shows the distance", () => {
    const sparse: NearestShelter = {
      id: "sparse-1",
      number: null,
      address: null,
      lat: 59.352,
      lon: 18.152,
      capacity: null,
      type: null,
      distanceMeters: 1500,
    }
    renderItem(sparse)

    expect(screen.queryByText(/Skyddsrumsnummer/)).toBeNull()
    expect(screen.getByText("1,5 km (fågelvägen)")).toBeTruthy()
  })
})
