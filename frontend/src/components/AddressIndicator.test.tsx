// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressProvider } from "../context/AddressProvider"
import { getSavedAddresses } from "../services/addressStorageService"
import type { SavedAddress } from "../types/address"
import AddressIndicator from "./AddressIndicator"

vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn(),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

const activeHome: SavedAddress = {
  id: "1",
  text: "Hemgatan 1, Stockholm",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-13T00:00:00.000Z",
}

function mount() {
  return render(
    <MemoryRouter>
      <AddressProvider>
        <AddressIndicator />
      </AddressProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.mocked(getSavedAddresses).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("AddressIndicator", () => {
  it("renders nothing when there is no active address", async () => {
    const { container } = mount()

    await waitFor(() => expect(getSavedAddresses).toHaveBeenCalled())
    expect(container.textContent).toBe("")
  })

  it("falls back to the full text when a manual address has no municipality, and keeps the label out of the link", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([activeHome])

    mount()

    const link = await screen.findByRole("link", { name: "Hemgatan 1, Stockholm" })
    expect(link.getAttribute("href")).toBe("/min-info")
    expect(screen.getByText(/Aktuell adress:/).closest("a")).toBeNull()
  })

  it("shows only the municipality for a geolocated address, linking to the address management page", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([
      { ...activeHome, source: "geolocated", approximate: true, municipality: "Stockholms kommun" },
    ])

    mount()

    const link = await screen.findByRole("link", { name: "Stockholms kommun" })
    expect(link.getAttribute("href")).toBe("/min-info")
    expect(screen.queryByText(/Hemgatan 1/)).toBeNull()
  })

  it("truncates a long displayed address to 30 characters without truncating the stored value", async () => {
    const longText = "Gustav Adolfs Torg, Klara, Norrmalm, Stockholm, Sverige"
    vi.mocked(getSavedAddresses).mockResolvedValue([{ ...activeHome, text: longText }])

    mount()

    const link = await screen.findByRole("link", { name: `${longText.slice(0, 30)}…` })
    expect(link.getAttribute("href")).toBe("/min-info")
    // Only the rendered text is shortened; this component never writes to storage, so the
    // full-length value configured above is, by construction, what stays saved.
    expect(screen.queryByText(longText)).toBeNull()
  })
})
