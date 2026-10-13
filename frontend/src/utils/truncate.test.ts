import { describe, expect, it } from "vitest"
import { truncateForDisplay } from "./truncate"

describe("truncateForDisplay", () => {
  it("returns text unchanged when at or under the limit", () => {
    expect(truncateForDisplay("Stockholms kommun", 30)).toBe("Stockholms kommun")
    expect(truncateForDisplay("x".repeat(30), 30)).toBe("x".repeat(30))
  })

  it("cuts text over the limit and appends an ellipsis", () => {
    const text = "x".repeat(50)
    const result = truncateForDisplay(text, 30)

    expect(result).toBe(`${"x".repeat(30)}…`)
    expect(result.length).toBe(31)
  })

  it("trims trailing whitespace left by the cut before adding the ellipsis", () => {
    const text = `${"a".repeat(29)} bbbb`

    expect(truncateForDisplay(text, 30)).toBe(`${"a".repeat(29)}…`)
  })
})
