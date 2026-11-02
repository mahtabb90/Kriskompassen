// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { CrisisIconName } from "../utils/crisisIcons"
import CrisisIcon from "./CrisisIcon"

const names: CrisisIconName[] = [
  "food",
  "water",
  "hygiene",
  "heat",
  "communication",
  "medicine",
  "payment",
  "pets",
  "other",
]

afterEach(cleanup)

describe("CrisisIcon", () => {
  it.each(names)("renders %s as a decorative, non-focusable outline icon", (name) => {
    const { container } = render(<CrisisIcon name={name} className="text-blue-900" />)
    const svg = container.querySelector("svg")

    expect(svg).not.toBeNull()
    expect(svg?.getAttribute("aria-hidden")).toBe("true")
    expect(svg?.getAttribute("focusable")).toBe("false")
    expect(svg?.getAttribute("stroke")).toBe("currentColor")
    expect(svg?.getAttribute("fill")).toBe("none")
    expect(svg?.getAttribute("class")).toContain("text-blue-900")
    expect(svg?.querySelector("title")).toBeNull()
    expect(svg?.childElementCount).toBeGreaterThan(0)
  })
})
