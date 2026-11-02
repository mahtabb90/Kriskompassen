import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../db/db", () => ({
  db: {
    shelterCache: {
      bulkPut: vi.fn(),
      toArray: vi.fn(),
      get: vi.fn(),
    },
    savedShelters: {
      put: vi.fn(),
      delete: vi.fn(),
      toArray: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { db } from "../db/db"
import type { Shelter } from "../types/shelter"
import {
  cacheShelters,
  getAllCachedShelters,
  getCachedShelterById,
  getSavedShelters,
  removeSavedShelter,
  saveShelter,
  setSavedShelterComment,
} from "./shelterStorageService"

const table = db.shelterCache
const savedTable = db.savedShelters
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
  vi.mocked(savedTable.put).mockResolvedValue(undefined as never)
  vi.mocked(savedTable.delete).mockResolvedValue(undefined)
  vi.mocked(savedTable.toArray).mockResolvedValue([])
  vi.mocked(savedTable.update).mockResolvedValue(1)
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

describe("saveShelter", () => {
  it("stores only the id, address and coordinates, tagged with a save timestamp", async () => {
    await saveShelter(shelter)

    expect(savedTable.put).toHaveBeenCalledExactlyOnceWith({
      id: "a",
      address: "Kantarellen 11",
      lat: 59.352,
      lon: 18.152,
      savedAt: expect.any(String),
      comment: null,
    })
  })
})

describe("removeSavedShelter", () => {
  it("deletes the bookmark by id", async () => {
    await removeSavedShelter("a")

    expect(savedTable.delete).toHaveBeenCalledExactlyOnceWith("a")
  })
})

describe("getSavedShelters", () => {
  it("returns every bookmarked shelter", async () => {
    const saved = {
      id: "a",
      address: "Kantarellen 11",
      lat: 59.352,
      lon: 18.152,
      savedAt: "2026-01-01T00:00:00Z",
      comment: null,
    }
    vi.mocked(savedTable.toArray).mockResolvedValue([saved])

    await expect(getSavedShelters()).resolves.toEqual([saved])
  })
})

describe("setSavedShelterComment", () => {
  it("trims and stores a comment", async () => {
    await setSavedShelterComment("a", "  Kommunhuset  ")

    expect(savedTable.update).toHaveBeenCalledExactlyOnceWith("a", { comment: "Kommunhuset" })
  })

  it("truncates to 50 characters", async () => {
    const long = "x".repeat(60)
    await setSavedShelterComment("a", long)

    expect(savedTable.update).toHaveBeenCalledExactlyOnceWith("a", { comment: "x".repeat(50) })
  })

  it("clears the comment to null when blank after trimming", async () => {
    await setSavedShelterComment("a", "   ")

    expect(savedTable.update).toHaveBeenCalledExactlyOnceWith("a", { comment: null })
  })
})
