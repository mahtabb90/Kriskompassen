// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getSavedShelters,
  removeSavedShelter,
  saveShelter,
  setSavedShelterComment,
} from "../services/shelterStorageService"
import type { SavedShelter } from "../types/shelter"
import { useSavedShelters } from "./useSavedShelters"

vi.mock("../services/shelterStorageService", () => ({
  getSavedShelters: vi.fn(),
  saveShelter: vi.fn(),
  removeSavedShelter: vi.fn(),
  setSavedShelterComment: vi.fn(),
}))

const home: SavedShelter = {
  id: "a",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  savedAt: "2026-01-01T00:00:00Z",
  comment: null,
}

beforeEach(() => {
  vi.mocked(getSavedShelters).mockResolvedValue([])
  vi.mocked(saveShelter).mockResolvedValue(undefined)
  vi.mocked(removeSavedShelter).mockResolvedValue(undefined)
  vi.mocked(setSavedShelterComment).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("useSavedShelters", () => {
  it("loads the saved list on mount", async () => {
    vi.mocked(getSavedShelters).mockResolvedValue([home])

    const { result } = renderHook(() => useSavedShelters())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shelters).toEqual([home])
  })

  it("reports whether a shelter id is saved", async () => {
    vi.mocked(getSavedShelters).mockResolvedValue([home])
    const { result } = renderHook(() => useSavedShelters())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isSaved("a")).toBe(true)
    expect(result.current.isSaved("missing")).toBe(false)
  })

  it("saves a shelter and refreshes the list", async () => {
    const { result } = renderHook(() => useSavedShelters())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getSavedShelters).mockResolvedValue([home])
    await act(async () => {
      await result.current.save({ id: "a", address: "Kantarellen 11", lat: 59.352, lon: 18.152 })
    })

    expect(saveShelter).toHaveBeenCalledExactlyOnceWith({
      id: "a",
      address: "Kantarellen 11",
      lat: 59.352,
      lon: 18.152,
    })
    expect(result.current.shelters).toEqual([home])
  })

  it("removes a shelter and refreshes the list", async () => {
    vi.mocked(getSavedShelters).mockResolvedValueOnce([home])
    const { result } = renderHook(() => useSavedShelters())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getSavedShelters).mockResolvedValue([])
    await act(async () => {
      await result.current.remove("a")
    })

    expect(removeSavedShelter).toHaveBeenCalledExactlyOnceWith("a")
    expect(result.current.shelters).toEqual([])
  })

  it("updates a shelter's comment and refreshes the list", async () => {
    const { result } = renderHook(() => useSavedShelters())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const commented = { ...home, comment: "Kommunhuset" }
    vi.mocked(getSavedShelters).mockResolvedValue([commented])
    await act(async () => {
      await result.current.updateComment("a", "Kommunhuset")
    })

    expect(setSavedShelterComment).toHaveBeenCalledExactlyOnceWith("a", "Kommunhuset")
    expect(result.current.shelters).toEqual([commented])
  })
})
