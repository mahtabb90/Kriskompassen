import { describe, expect, it } from "vitest"
import { krisinfoSections } from "../content/krisinfo/index"
import type { SignalPattern } from "../types/krisinfo"
import { computeSignalStrokes, formatSignalSeconds } from "./signalPattern"

const signals = krisinfoSections["warning-signals"].items

function patternOf(id: string): SignalPattern {
  const found = signals.find((item) => item.id === id)
  if (!found) throw new Error(`Missing signal ${id}`)
  return found.pattern
}

function starts(pattern: SignalPattern) {
  return computeSignalStrokes(pattern).strokes.map((stroke) => stroke.startSeconds)
}

describe("computeSignalStrokes", () => {
  it("draws the content's four signals with the source's number and length of tones", () => {
    const summary = signals.map((item) => {
      const { spanSeconds, strokes } = computeSignalStrokes(item.pattern)
      return [
        item.id,
        strokes.length,
        [...new Set(strokes.map((s) => s.lengthSeconds))],
        spanSeconds,
      ]
    })
    expect(summary).toEqual([
      ["important-message", 6, [7], 112],
      ["air-raid", 15, [2], 58],
      ["readiness-alert", 7, [30], 300],
      ["all-clear", 1, [30], 30],
    ])
  })

  it("ends each content signal's timeline at its stated duration, or its last tone", () => {
    expect(
      signals.map((item) => [item.id, computeSignalStrokes(item.pattern).timelineSeconds])
    ).toEqual([
      ["important-message", 120],
      ["air-raid", 60],
      ["readiness-alert", 300],
      ["all-clear", 30],
    ])
  })

  it("never ends the timeline before the last tone", () => {
    for (const { pattern } of signals) {
      const { spanSeconds, timelineSeconds } = computeSignalStrokes(pattern)
      expect(timelineSeconds).toBeGreaterThanOrEqual(spanSeconds)
    }
  })

  it("separates consecutive tones by the pause", () => {
    expect(starts(patternOf("important-message"))).toEqual([0, 21, 42, 63, 84, 105])
    expect(starts(patternOf("readiness-alert"))).toEqual([0, 45, 90, 135, 180, 225, 270])
    expect(starts(patternOf("air-raid"))).toEqual(Array.from({ length: 15 }, (_, i) => i * 4))
    expect(starts(patternOf("all-clear"))).toEqual([0])
  })

  it("never draws past the stated total duration", () => {
    for (const { pattern } of signals) {
      if (pattern.totalDurationSeconds === undefined) continue
      expect(computeSignalStrokes(pattern).spanSeconds).toBeLessThanOrEqual(
        pattern.totalDurationSeconds
      )
    }
  })

  it("counts only whole tones that fit, with no pause after the last one", () => {
    // 3 tones need 3 + 2 + 3 + 2 + 3 = 13 seconds; 12 seconds fits only 2.
    expect(
      computeSignalStrokes({ toneSeconds: 3, pauseSeconds: 2, totalDurationSeconds: 13 }).strokes
    ).toHaveLength(3)
    expect(
      computeSignalStrokes({ toneSeconds: 3, pauseSeconds: 2, totalDurationSeconds: 12 }).strokes
    ).toHaveLength(2)
  })

  it("fits tones exactly despite floating-point timing", () => {
    const { strokes } = computeSignalStrokes({
      toneSeconds: 0.1,
      pauseSeconds: 0.2,
      totalDurationSeconds: 0.7,
    })
    expect(strokes).toHaveLength(3)
  })

  it("places tones back to back when there is no pause", () => {
    expect(starts({ toneSeconds: 5, pauseSeconds: 0, totalDurationSeconds: 15 })).toEqual([
      0, 5, 10,
    ])
  })

  it.each<[string, SignalPattern]>([
    ["a zero tone", { toneSeconds: 0, pauseSeconds: 1, repeatCount: 2 }],
    ["a negative tone", { toneSeconds: -1, pauseSeconds: 1, repeatCount: 2 }],
    ["an infinite tone", { toneSeconds: Infinity, pauseSeconds: 1, repeatCount: 2 }],
    ["a negative pause", { toneSeconds: 1, pauseSeconds: -1, repeatCount: 2 }],
    ["a missing pause", { toneSeconds: 1, pauseSeconds: NaN, repeatCount: 2 }],
    ["zero repeats", { toneSeconds: 1, pauseSeconds: 1, repeatCount: 0 }],
    ["a fractional repeat count", { toneSeconds: 1, pauseSeconds: 1, repeatCount: 1.5 }],
    [
      "a duration shorter than one tone",
      { toneSeconds: 5, pauseSeconds: 1, totalDurationSeconds: 4 },
    ],
    ["a zero duration", { toneSeconds: 5, pauseSeconds: 1, totalDurationSeconds: 0 }],
  ])("rejects %s instead of drawing a misleading pattern", (_case, pattern) => {
    expect(() => computeSignalStrokes(pattern)).toThrow(RangeError)
  })
})

describe("formatSignalSeconds", () => {
  it.each([
    [0, "0 s"],
    [30, "30 s"],
    [58, "58 s"],
    [60, "1 min"],
    [112, "112 s"],
    [120, "2 min"],
    [300, "5 min"],
    [90, "90 s"],
    [0.5, "0,5 s"],
  ])("formats %s seconds as %s", (seconds, label) => {
    expect(formatSignalSeconds(seconds)).toBe(label)
  })

  it("labels the content signals' timelines from 0 s to their end", () => {
    expect(
      signals.map((item) => formatSignalSeconds(computeSignalStrokes(item.pattern).timelineSeconds))
    ).toEqual(["2 min", "1 min", "5 min", "30 s"])
  })

  it.each([-1, NaN, Infinity])("rejects %s seconds", (seconds) => {
    expect(() => formatSignalSeconds(seconds)).toThrow(RangeError)
  })
})
