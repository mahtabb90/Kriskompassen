// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { SignalPattern as SignalPatternData } from "../types/krisinfo"
import SignalPattern from "./SignalPattern"

// Synthetic patterns, so these tests cover the drawing for its props. The bundled signals'
// stroke counts and labels are pinned by the calculation and page tests.
const SHORT: SignalPatternData = { toneSeconds: 2, pauseSeconds: 2, repeatCount: 3 }
// The same rhythm as SHORT, fifteen times slower.
const LONG: SignalPatternData = { toneSeconds: 30, pauseSeconds: 30, repeatCount: 3 }

afterEach(cleanup)

function tones(container: HTMLElement) {
  return [...container.querySelectorAll("g rect")].map((rect) => [
    rect.getAttribute("x"),
    rect.getAttribute("width"),
  ])
}

function labels(container: HTMLElement) {
  return [...container.querySelectorAll("span")].map((span) => span.textContent)
}

describe("SignalPattern", () => {
  it("draws one stroke per tone, with gaps for the pauses, as shares of the timeline", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    // 3 tones of 2 s and 2 pauses of 2 s fill a 10 s timeline.
    expect(tones(container)).toEqual([
      ["0%", "20%"],
      ["40%", "20%"],
      ["80%", "20%"],
    ])
  })

  it("scales every signal to the full width, however long its tones are", () => {
    const short = render(<SignalPattern pattern={SHORT} />).container
    const long = render(<SignalPattern pattern={LONG} />).container
    expect(tones(long)).toEqual(tones(short))
  })

  it("leaves the end of the track free when the stated duration outlasts the last tone", () => {
    const { container } = render(
      <SignalPattern pattern={{ toneSeconds: 2, pauseSeconds: 2, totalDurationSeconds: 20 }} />
    )
    // 5 whole tones fit in 20 s; the last ends at 18 s, 90% of the timeline.
    const last = tones(container).at(-1)!
    expect(last).toEqual(["80%", "10%"])
    expect(labels(container)).toEqual(["0 s", "20 s"])
  })

  it("draws a single continuous tone as one stroke across the whole width", () => {
    const { container } = render(
      <SignalPattern pattern={{ toneSeconds: 30, pauseSeconds: 0, repeatCount: 1 }} />
    )
    expect(tones(container)).toEqual([["0%", "100%"]])
    expect(labels(container)).toEqual(["0 s", "30 s"])
  })

  it("draws a thin full-width track beneath pill-shaped tones that are never stretched", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    const svg = container.querySelector("svg")!
    expect(svg.hasAttribute("viewBox")).toBe(false)
    expect(svg.hasAttribute("preserveAspectRatio")).toBe(false)

    const track = svg.querySelector(":scope > rect")!
    expect(track.getAttribute("width")).toBe("100%")
    expect(Number(track.getAttribute("rx")) * 2).toBe(Number(track.getAttribute("height")))
    const toneHeight = Number(svg.querySelector("g rect")!.getAttribute("height"))
    expect(Number(track.getAttribute("height"))).toBeLessThan(toneHeight)

    for (const tone of svg.querySelectorAll("g rect")) {
      expect(Number(tone.getAttribute("rx")) * 2).toBe(Number(tone.getAttribute("height")))
    }
  })

  it("labels the start and the end of the timeline", () => {
    const { container } = render(
      <SignalPattern pattern={{ toneSeconds: 30, pauseSeconds: 15, totalDurationSeconds: 300 }} />
    )
    expect(labels(container)).toEqual(["0 s", "5 min"])
  })

  it("is hidden from assistive technology, labels included", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    const wrapper = container.firstElementChild!
    expect(wrapper.getAttribute("aria-hidden")).toBe("true")
    expect(wrapper.contains(container.querySelector("span"))).toBe(true)
    const svg = wrapper.querySelector("svg")!
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.getAttribute("focusable")).toBe("false")
    expect(svg.querySelector("title, text")).toBeNull()
  })

  it("draws the tones in currentColor on a blue timeline, never red", () => {
    const { container } = render(<SignalPattern pattern={SHORT} />)
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("text-blue-900")
    expect(container.querySelector("g")!.getAttribute("fill")).toBe("currentColor")
    expect(container.innerHTML).not.toMatch(/red|vma/)
  })
})
