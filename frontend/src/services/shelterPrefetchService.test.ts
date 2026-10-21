// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./shelterService", () => ({ fetchNearestShelters: vi.fn() }))
vi.mock("./shelterStorageService", () => ({ cacheShelters: vi.fn() }))

import { fetchNearestShelters } from "./shelterService"
import { cacheShelters } from "./shelterStorageService"
import { prefetchNearestShelters } from "./shelterPrefetchService"
import type { Shelter, ShelterListResponse } from "../types/shelter"

const shelter: Shelter = {
  id: "a",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 200,
  type: "Skyddsrum",
}

function response(shelters: Shelter[]): ShelterListResponse {
  return {
    shelters,
    source: {
      name: "MCF",
      url: "https://example.com",
      apiName: "WFS",
      apiUrl: "https://example.com/wfs",
    },
    bboxRadiusMetersUsed: 2000,
  }
}

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(fetchNearestShelters).mockResolvedValue(response([shelter]))
  vi.mocked(cacheShelters).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("prefetchNearestShelters", () => {
  it("fetches and caches the shelters nearest the given position", async () => {
    await prefetchNearestShelters({ lat: 59.0, lon: 18.0 })

    expect(fetchNearestShelters).toHaveBeenCalledExactlyOnceWith(59.0, 18.0)
    expect(cacheShelters).toHaveBeenCalledExactlyOnceWith([shelter])
  })

  it("does nothing while offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)

    await prefetchNearestShelters({ lat: 59.0, lon: 18.0 })

    expect(fetchNearestShelters).not.toHaveBeenCalled()
    expect(cacheShelters).not.toHaveBeenCalled()
  })

  it("swallows a failed fetch instead of throwing", async () => {
    vi.mocked(fetchNearestShelters).mockRejectedValue(new Error("MCF unreachable"))

    await expect(prefetchNearestShelters({ lat: 59.0, lon: 18.0 })).resolves.toBeUndefined()
    expect(cacheShelters).not.toHaveBeenCalled()
  })

  it("swallows a failed cache write instead of throwing", async () => {
    vi.mocked(cacheShelters).mockRejectedValue(new Error("IndexedDB unavailable"))

    await expect(prefetchNearestShelters({ lat: 59.0, lon: 18.0 })).resolves.toBeUndefined()
  })
})
