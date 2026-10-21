import { describe, expect, it } from "vitest"
import { describeShelterLocation } from "./shelterLabel"

describe("describeShelterLocation", () => {
  it("combines the address and municipality when both are known", () => {
    expect(describeShelterLocation({ address: "Kantarellen 11" }, "Solna kommun")).toBe(
      "Kantarellen 11, Solna kommun"
    )
  })

  it("falls back to the address alone when no municipality is known", () => {
    expect(describeShelterLocation({ address: "Kantarellen 11" }, null)).toBe("Kantarellen 11")
    expect(describeShelterLocation({ address: "Kantarellen 11" })).toBe("Kantarellen 11")
  })

  it("falls back to the municipality alone when no address is known", () => {
    expect(describeShelterLocation({ address: null }, "Solna kommun")).toBe("Nära Solna kommun")
  })

  it("never returns an empty string when neither is known", () => {
    expect(describeShelterLocation({ address: null }, null)).toBe("Skyddsrum")
    expect(describeShelterLocation({ address: null })).toBe("Skyddsrum")
  })

  it("treats a blank address or municipality as missing", () => {
    expect(describeShelterLocation({ address: "   " }, "  ")).toBe("Skyddsrum")
  })
})
