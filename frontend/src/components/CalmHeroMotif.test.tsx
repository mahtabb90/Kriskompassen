// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import CalmHeroMotif from "./CalmHeroMotif"

afterEach(cleanup)

describe("CalmHeroMotif", () => {
  it("is a static decorative graphic with three rings, a wave and one amber dot", () => {
    const { container } = render(<CalmHeroMotif className="size-28" />)
    const svg = container.querySelector("svg")!
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.getAttribute("focusable")).toBe("false")
    expect(svg.querySelector("title")).toBeNull()
    expect(svg.querySelectorAll("circle")).toHaveLength(4)
    expect(svg.querySelectorAll("circle.text-amber-400")).toHaveLength(1)
    expect(svg.querySelectorAll("path")).toHaveLength(1)
    expect(svg.querySelector("animate, animateTransform, animateMotion, style")).toBeNull()
  })
})
