import { describe, expect, it } from "vitest"
import { formatShelterCapacity } from "./formatCapacity"

const sv = new Intl.NumberFormat("sv-SE")

describe("formatShelterCapacity", () => {
  it("formats a four-digit capacity with a Swedish thousands separator", () => {
    expect(formatShelterCapacity(1200)).toBe(`${sv.format(1200)} platser`)
  })

  it("formats a small capacity without a separator", () => {
    expect(formatShelterCapacity(45)).toBe("45 platser")
  })

  it("formats zero", () => {
    expect(formatShelterCapacity(0)).toBe("0 platser")
  })
})
