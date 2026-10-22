import { describe, expect, it } from "vitest"
import { describeShelterType } from "./shelterType"

describe("describeShelterType", () => {
  it("returns the readable label for a known type", () => {
    expect(describeShelterType("Skyddsrum")).toBe("Skyddsrum")
  })

  it("falls back to the raw value for an unmapped type", () => {
    expect(describeShelterType("some-future-code")).toBe("some-future-code")
  })
})
