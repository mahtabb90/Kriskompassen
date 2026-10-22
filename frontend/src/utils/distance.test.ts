import { describe, expect, it } from "vitest"
import {
  formatDistanceMeters,
  formatDistanceMetersForScreenReader,
  haversineDistanceMeters,
  nearestN,
} from "./distance"

const STOCKHOLM = { lat: 59.3293, lon: 18.0686 }
const GOTHENBURG = { lat: 57.7089, lon: 11.9746 }

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceMeters(STOCKHOLM, STOCKHOLM)).toBe(0)
  })

  it("matches the known distance between two Swedish cities within a 2% tolerance", () => {
    const distance = haversineDistanceMeters(STOCKHOLM, GOTHENBURG)
    expect(distance).toBeGreaterThan(390_000)
    expect(distance).toBeLessThan(405_000)
  })

  it("is symmetric", () => {
    expect(haversineDistanceMeters(STOCKHOLM, GOTHENBURG)).toBeCloseTo(
      haversineDistanceMeters(GOTHENBURG, STOCKHOLM)
    )
  })
})

describe("nearestN", () => {
  const origin = { lat: 59.0, lon: 18.0 }
  const near = { id: "near", lat: 59.001, lon: 18.0 }
  const mid = { id: "mid", lat: 59.01, lon: 18.0 }
  const far = { id: "far", lat: 59.1, lon: 18.0 }

  it("sorts nearest first and tags each item with its distance", () => {
    const result = nearestN(origin, [far, mid, near], 3)
    expect(result.map((item) => item.id)).toEqual(["near", "mid", "far"])
    expect(result[0].distanceMeters).toBeLessThan(result[1].distanceMeters)
    expect(result[1].distanceMeters).toBeLessThan(result[2].distanceMeters)
  })

  it("slices to n when there are more items than requested", () => {
    expect(nearestN(origin, [far, near, mid], 2).map((item) => item.id)).toEqual(["near", "mid"])
  })

  it("returns every item when n exceeds the list length", () => {
    expect(nearestN(origin, [near], 5)).toHaveLength(1)
  })

  it("returns an empty array for an empty list", () => {
    expect(nearestN(origin, [], 5)).toEqual([])
  })

  it("returns an empty array when n is 0 or negative", () => {
    expect(nearestN(origin, [near, mid], 0)).toEqual([])
    expect(nearestN(origin, [near, mid], -1)).toEqual([])
  })

  it("keeps the original relative order for exact ties", () => {
    const a = { id: "a", lat: 59.0, lon: 18.001 }
    const b = { id: "b", lat: 59.0, lon: 18.001 }
    expect(nearestN(origin, [a, b], 2).map((item) => item.id)).toEqual(["a", "b"])
  })
})

describe("formatDistanceMeters", () => {
  it("rounds sub-kilometer distances to whole meters", () => {
    expect(formatDistanceMeters(350)).toBe("350 m")
    expect(formatDistanceMeters(999.6)).toBe("1000 m")
  })

  it("formats kilometer distances with one Swedish decimal", () => {
    expect(formatDistanceMeters(1500)).toBe("1,5 km")
  })

  it("omits a trailing decimal when not needed", () => {
    expect(formatDistanceMeters(12_000)).toBe("12 km")
  })
})

describe("formatDistanceMetersForScreenReader", () => {
  it("spells out meter below one kilometer", () => {
    expect(formatDistanceMetersForScreenReader(350)).toBe("350 meter")
  })

  it("spells out kilometer at or above one kilometer", () => {
    expect(formatDistanceMetersForScreenReader(1500)).toBe("1,5 kilometer")
    expect(formatDistanceMetersForScreenReader(12_000)).toBe("12 kilometer")
  })
})
