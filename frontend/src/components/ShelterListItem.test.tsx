// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import type { Shelter } from "../types/shelter"
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

const fullShelter: Shelter = {
  id: "a0f314b8-0532-4783-a949-df9ff4a9d73d",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 1200,
  type: "Skyddsrum",
}

function renderItem(
  shelter: Shelter,
  props: {
    distanceMeters?: number
    saved?: boolean
    onToggleSave?: () => void
    comment?: string | null
  } = {}
) {
  return render(
    <MemoryRouter>
      <ul>
        <ShelterListItem shelter={shelter} {...props} />
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
  it("renders distance, number, type, capacity and the map link", () => {
    renderItem(fullShelter, { distanceMeters: 350 })

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

  it("omits the distance line entirely when no position is known", () => {
    renderItem(fullShelter)

    expect(screen.queryByText(/fågelvägen/)).toBeNull()
    expect(screen.getByText(/platser/)).toBeTruthy()
  })
})

describe("ShelterListItem with missing fields", () => {
  it("hides fields absent from the source data but always shows the distance when known", () => {
    const sparse: Shelter = {
      id: "sparse-1",
      number: null,
      address: null,
      lat: 59.352,
      lon: 18.152,
      capacity: null,
      type: null,
    }
    renderItem(sparse, { distanceMeters: 1500 })

    expect(screen.queryByText(/Skyddsrumsnummer/)).toBeNull()
    expect(screen.getByText("1,5 km (fågelvägen)")).toBeTruthy()
  })
})

describe("ShelterListItem save toggle", () => {
  it("renders no save status or button when onToggleSave is omitted, just a plain detail link", () => {
    renderItem(fullShelter, { distanceMeters: 350 })

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByRole("link", { name: "Visa detaljer" })).toBeTruthy()
  })

  it("shows the unsaved status and save button, and calls onToggleSave on click", () => {
    const onToggleSave = vi.fn()
    renderItem(fullShelter, { distanceMeters: 350, saved: false, onToggleSave })

    expect(screen.getByText("Inte sparat")).toBeTruthy()
    const saveButton = screen.getByRole("button", { name: "Spara skyddsrum" })
    fireEvent.click(saveButton)
    expect(onToggleSave).toHaveBeenCalledOnce()
  })

  it("shows the saved status and remove button when already saved", () => {
    renderItem(fullShelter, { distanceMeters: 350, saved: true, onToggleSave: vi.fn() })

    expect(screen.getByText("Sparat skyddsrum")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Ta bort sparat skyddsrum" })).toBeTruthy()
  })

  it("keeps the detail link in the same row as the save button", () => {
    renderItem(fullShelter, { distanceMeters: 350, saved: false, onToggleSave: vi.fn() })

    expect(screen.getByRole("button", { name: "Spara skyddsrum" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Visa detaljer" })).toBeTruthy()
  })
})

describe("ShelterListItem comment", () => {
  it("shows the user's relocation comment when set", () => {
    renderItem(fullShelter, { comment: "Kommunhuset" })

    expect(screen.getByText("Kommunhuset")).toBeTruthy()
  })

  it("shows nothing extra when there is no comment", () => {
    renderItem(fullShelter, { comment: null })

    expect(screen.queryByText("Kommunhuset")).toBeNull()
  })
})
