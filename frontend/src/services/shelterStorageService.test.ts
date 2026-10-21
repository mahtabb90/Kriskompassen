import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db/db", () => ({
  db: {
    shelterCache: {
      bulkPut: vi.fn(),
      toArray: vi.fn(),
    },
  },
}))

import { db } from "../db/db"
import type { Shelter } from "../types/shelter"
import { cacheShelters, getAllCachedShelters } from "./shelterStorageService"

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
