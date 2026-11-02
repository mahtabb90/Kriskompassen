// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import CompassHeroMotif from "./CompassHeroMotif"

afterEach(cleanup)

describe("CompassHeroMotif", () => {
  it("is a static decorative graphic with two rings, a hub, ticks, a needle and one amber dot", () => {
    const { container } = render(<CompassHeroMotif className="size-56" />)
    const svg = container.querySelector("svg")!
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.getAttribute("focusable")).toBe("false")
    expect(svg.querySelector("title")).toBeNull()
    expect(svg.querySelectorAll("circle")).toHaveLength(4)
    expect(svg.querySelectorAll("circle.text-amber-400")).toHaveLength(1)
    // One path for the four ticks and two for the needle halves.
    expect(svg.querySelectorAll("path")).toHaveLength(3)
    expect(svg.querySelector("text, linearGradient, radialGradient")).toBeNull()
    expect(svg.querySelector("animate, animateTransform, animateMotion, style")).toBeNull()
    expect(svg.getAttribute("class")).toContain("size-56")
  })
})
