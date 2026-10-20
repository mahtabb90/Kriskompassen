import { describe, expect, it } from "vitest"
import { isValidLatLon, parseCoordinates } from "./coordinates"

describe("parseCoordinates", () => {
  it("parses a comma-and-space-separated pair", () => {
    expect(parseCoordinates("59.3293, 18.0686")).toEqual({ lat: 59.3293, lon: 18.0686 })
  })

  it("parses a comma-separated pair without a space", () => {
    expect(parseCoordinates("59.3293,18.0686")).toEqual({ lat: 59.3293, lon: 18.0686 })
  })

  it("parses a whitespace-separated pair", () => {
    expect(parseCoordinates("59.3293 18.0686")).toEqual({ lat: 59.3293, lon: 18.0686 })
  })

  it("parses negative and integer values", () => {
    expect(parseCoordinates("-33, 151")).toEqual({ lat: -33, lon: 151 })
  })

  it("ignores surrounding whitespace", () => {
    expect(parseCoordinates("  59.3293, 18.0686  ")).toEqual({ lat: 59.3293, lon: 18.0686 })
  })

  it("returns the parsed numbers even when out of range", () => {
    expect(parseCoordinates("120, 200")).toEqual({ lat: 120, lon: 200 })
  })

  it("returns null for a normal address", () => {
    expect(parseCoordinates("Storgatan 1, Stockholm")).toBeNull()
  })

  it("returns null for a single number", () => {
    expect(parseCoordinates("59.3293")).toBeNull()
  })

  it("returns null for two numbers with no separator", () => {
    expect(parseCoordinates("59.3293018.0686")).toBeNull()
  })

  it("returns null for empty text", () => {
    expect(parseCoordinates("")).toBeNull()
  })
})

describe("isValidLatLon", () => {
  it("accepts values at and within the valid ranges", () => {
    expect(isValidLatLon(0, 0)).toBe(true)
    expect(isValidLatLon(90, 180)).toBe(true)
    expect(isValidLatLon(-90, -180)).toBe(true)
  })

  it("rejects a latitude outside -90..90", () => {
    expect(isValidLatLon(90.1, 0)).toBe(false)
    expect(isValidLatLon(-90.1, 0)).toBe(false)
  })

  it("rejects a longitude outside -180..180", () => {
    expect(isValidLatLon(0, 180.1)).toBe(false)
    expect(isValidLatLon(0, -180.1)).toBe(false)
  })
})
