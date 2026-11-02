// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useAddresses, type AddressContextValue } from "../context/addressContext"
import { getAllCachedShelters } from "../services/shelterStorageService"
import type { CachedShelter, SavedShelter } from "../types/shelter"
import SavedSheltersSection from "./SavedSheltersSection"

vi.mock("../services/shelterStorageService", () => ({
  getAllCachedShelters: vi.fn(),
}))

vi.mock("../context/addressContext", () => ({
  useAddresses: vi.fn(),
}))

const savedHome: SavedShelter = {
  id: "a",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  savedAt: "2026-01-01T00:00:00Z",
  comment: null,
}

const cachedHome: CachedShelter = {
  id: "a",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 1200,
  type: "Skyddsrum",
  fetchedAt: "2026-01-01T00:00:00Z",
}

function renderSection(props: Partial<Parameters<typeof SavedSheltersSection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SavedSheltersSection
        origin={null}
        savedShelters={[]}
        loading={false}
        onRemove={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.mocked(useAddresses).mockReturnValue({
    activeAddress: { municipality: "Solna kommun" },
  } as unknown as AddressContextValue)
  vi.mocked(getAllCachedShelters).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SavedSheltersSection", () => {
  it("renders nothing while loading", () => {
    const { container } = renderSection({ loading: true })
    expect(container.textContent).toBe("")
  })

  it("shows an empty-state message when there are no saved shelters", () => {
    renderSection({ savedShelters: [] })
    expect(screen.getByText(/Inga skyddsrum sparade än/)).toBeTruthy()
  })

  it("enriches a saved shelter with cached data when available", async () => {
    vi.mocked(getAllCachedShelters).mockResolvedValue([cachedHome])
    renderSection({ savedShelters: [savedHome] })

    expect(await screen.findByText("Skyddsrumsnummer 120599-3")).toBeTruthy()
    expect(screen.getByText(/platser/).textContent).toContain("Skyddsrum")
  })

  it("falls back to the saved address when the shelter is no longer cached", async () => {
    vi.mocked(getAllCachedShelters).mockResolvedValue([])
    renderSection({ savedShelters: [savedHome] })

    expect(await screen.findByText("Kantarellen 11, Solna kommun")).toBeTruthy()
    expect(screen.queryByText(/Skyddsrumsnummer/)).toBeNull()
  })

  it("shows distance only when the user's position is known", async () => {
    vi.mocked(getAllCachedShelters).mockResolvedValue([cachedHome])

    const { rerender } = renderSection({ savedShelters: [savedHome], origin: null })
    await screen.findByText("Skyddsrumsnummer 120599-3")
    expect(screen.queryByText(/\(fågelvägen\)/)).toBeNull()

    rerender(
      <MemoryRouter>
        <SavedSheltersSection
          origin={{ lat: 59.3, lon: 18.0 }}
          savedShelters={[savedHome]}
          loading={false}
          onRemove={vi.fn()}
        />
      </MemoryRouter>
    )
    expect(await screen.findByText(/\(fågelvägen\)/)).toBeTruthy()
  })

  it("removes a saved shelter", async () => {
    const onRemove = vi.fn()
    vi.mocked(getAllCachedShelters).mockResolvedValue([cachedHome])
    renderSection({ savedShelters: [savedHome], onRemove })

    const removeButton = await screen.findByRole("button", { name: "Ta bort sparat skyddsrum" })
    fireEvent.click(removeButton)
    await waitFor(() => expect(onRemove).toHaveBeenCalledExactlyOnceWith("a"))
  })

  it("passes a saved shelter's comment through to its card", async () => {
    vi.mocked(getAllCachedShelters).mockResolvedValue([cachedHome])
    renderSection({ savedShelters: [{ ...savedHome, comment: "Kommunhuset" }] })

    expect(await screen.findByText("Kommunhuset")).toBeTruthy()
  })
})
