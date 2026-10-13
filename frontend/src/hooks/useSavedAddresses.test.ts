// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getSavedAddresses,
  removeAddress,
  saveAddress,
  setActiveAddress,
} from "../services/addressStorageService"
import type { SavedAddress } from "../types/address"
import { useSavedAddresses } from "./useSavedAddresses"

vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn(),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

const home: SavedAddress = {
  id: "1",
  text: "Hemgatan 1",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-13T00:00:00.000Z",
}
const work: SavedAddress = {
  ...home,
  id: "2",
  text: "Jobbgatan 2",
  label: { kind: "arbete" },
  isActive: false,
}

beforeEach(() => {
  vi.mocked(getSavedAddresses).mockResolvedValue([])
  vi.mocked(saveAddress).mockResolvedValue(home)
  vi.mocked(setActiveAddress).mockResolvedValue(undefined)
  vi.mocked(removeAddress).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("useSavedAddresses", () => {
  it("loads the saved list on mount and exposes the active address", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home, work])

    const { result } = renderHook(() => useSavedAddresses())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.addresses).toEqual([home, work])
    expect(result.current.activeAddress).toEqual(home)
  })

  it("has no active address when none is marked active", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([{ ...work, isActive: false }])

    const { result } = renderHook(() => useSavedAddresses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activeAddress).toBeNull()
  })

  it("saves a new address and refreshes the list", async () => {
    const { result } = renderHook(() => useSavedAddresses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    await act(async () => {
      await result.current.addAddress(
        { text: "Hemgatan 1", source: "manual", approximate: false },
        { kind: "hem" }
      )
    })

    expect(saveAddress).toHaveBeenCalledWith(
      { text: "Hemgatan 1", source: "manual", approximate: false },
      { kind: "hem" }
    )
    expect(result.current.addresses).toEqual([home])
  })

  it("activates a saved address and refreshes the list", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValueOnce([home, work])
    const { result } = renderHook(() => useSavedAddresses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const activatedWork = { ...work, isActive: true }
    const deactivatedHome = { ...home, isActive: false }
    vi.mocked(getSavedAddresses).mockResolvedValue([deactivatedHome, activatedWork])

    await act(async () => {
      await result.current.setActive("2")
    })

    expect(setActiveAddress).toHaveBeenCalledWith("2")
    expect(result.current.activeAddress).toEqual(activatedWork)
  })

  it("removes a saved address and refreshes the list", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValueOnce([home, work])
    const { result } = renderHook(() => useSavedAddresses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    await act(async () => {
      await result.current.remove("2")
    })

    expect(removeAddress).toHaveBeenCalledWith("2")
    expect(result.current.addresses).toEqual([home])
  })
})
