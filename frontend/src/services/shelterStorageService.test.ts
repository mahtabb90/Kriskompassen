import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db/db", () => ({
  db: {
    shelterCache: {
      bulkPut: vi.fn(),
      toArray: vi.fn(),
      get: vi.fn(),
    },
  },
}))

import { db } from "../db/db"
import type { Shelter } from "../types/shelter"
import { cacheShelters, getAllCachedShelters, getCachedShelterById } from "./shelterStorageService"

const table = db.shelterCache
const shelter: Shelter = {
  id: "a",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 200,
  type: "Skyddsrum",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(table.bulkPut).mockResolvedValue(undefined as never)
  vi.mocked(table.toArray).mockResolvedValue([])
  vi.mocked(table.get).mockResolvedValue(undefined)
})

describe("cacheShelters", () => {
  it("tags each shelter with a cache timestamp and writes them through", async () => {
    await cacheShelters([shelter])

    expect(table.bulkPut).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ ...shelter, fetchedAt: expect.any(String) }),
    ])
  })

  it("does nothing for an empty list", async () => {
    await cacheShelters([])

    expect(table.bulkPut).not.toHaveBeenCalled()
  })
})

describe("getAllCachedShelters", () => {
  it("returns every cached shelter", async () => {
    vi.mocked(table.toArray).mockResolvedValue([{ ...shelter, fetchedAt: "2026-01-01T00:00:00Z" }])

    await expect(getAllCachedShelters()).resolves.toEqual([
      { ...shelter, fetchedAt: "2026-01-01T00:00:00Z" },
    ])
  })
})

describe("getCachedShelterById", () => {
  it("returns the cached shelter matching the id", async () => {
    const cached = { ...shelter, fetchedAt: "2026-01-01T00:00:00Z" }
    vi.mocked(table.get).mockResolvedValue(cached)

    await expect(getCachedShelterById("a")).resolves.toEqual(cached)
    expect(table.get).toHaveBeenCalledExactlyOnceWith("a")
  })

  it("returns undefined when the shelter was never cached", async () => {
    await expect(getCachedShelterById("missing")).resolves.toBeUndefined()
  })
})
