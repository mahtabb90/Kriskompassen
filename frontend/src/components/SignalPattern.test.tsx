// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { SignalPattern as SignalPatternData } from "../types/krisinfo"
import SignalPattern from "./SignalPattern"

// Synthetic patterns, so these tests cover the drawing for its props. The bundled signals'
// stroke counts are pinned by the calculation and page tests.
const SHORT: SignalPatternData = { toneSeconds: 2, pauseSeconds: 2, repeatCount: 3 }
// The same rhythm as SHORT, fifteen times slower.
const LONG: SignalPatternData = { toneSeconds: 30, pauseSeconds: 30, repeatCount: 3 }

afterEach(cleanup)

function strokes(container: HTMLElement) {
  return [...container.querySelectorAll("rect")].map((rect) => [
    Number(rect.getAttribute("x")),
    Number(rect.getAttribute("width")),
  ])
}

describe("SignalPattern", () => {
  it("draws one stroke per tone, with gaps for the pauses", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    // 3 tones of 2 s and 2 pauses of 2 s span 10 s, drawn across 240 units.
    expect(strokes(container)).toEqual([
      [0, 48],
      [96, 48],
      [192, 48],
    ])
  })

  it("scales every signal to the full width, however long its tones are", () => {
    const short = render(<SignalPattern pattern={SHORT} />).container
    const long = render(<SignalPattern pattern={LONG} />).container
    expect(strokes(long)).toEqual(strokes(short))
  })

  it("draws a single continuous tone as one stroke across the whole width", () => {
    const { container } = render(
      <SignalPattern pattern={{ toneSeconds: 30, pauseSeconds: 0, repeatCount: 1 }} />
    )
    expect(strokes(container)).toEqual([[0, 240]])
  })

  it("is hidden from assistive technology and contains no text", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    const wrapper = container.firstElementChild!
    expect(wrapper.getAttribute("aria-hidden")).toBe("true")
    expect(wrapper.textContent).toBe("")
    for (const svg of wrapper.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true")
      expect(svg.getAttribute("focusable")).toBe("false")
      expect(svg.querySelector("title")).toBeNull()
    }
  })

  it("draws the strokes in currentColor on a blue timeline, never red", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    const timeline = container.querySelector("rect")!.closest("svg")!
    expect(timeline.getAttribute("class")).toContain("text-blue-900")
    for (const rect of container.querySelectorAll("rect")) {
      expect(rect.getAttribute("fill")).toBe("currentColor")
    }
    expect(container.innerHTML).not.toMatch(/red|vma/)
  })
})
