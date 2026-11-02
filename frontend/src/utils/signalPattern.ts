import type { SignalPattern } from "../types/krisinfo"

// Absorbs floating-point error so a duration that fits exactly is never one tone short.
const FIT_TOLERANCE = 1e-9

/**
 * One tone of a signal, positioned on the signal's own timeline.
 *
 * @property startSeconds When the tone starts, counted from the start of the first tone.
 * @property lengthSeconds How long the tone sounds.
 */
export interface SignalStroke {
  startSeconds: number
  lengthSeconds: number
}

/**
 * The tones of a signal, ready to draw on a timeline of its own length.
 *
 * @property spanSeconds Time from the start of the first tone to the end of the last, so a
 * drawing can scale each signal to its full width.
 * @property strokes The tones in order, one per drawn stroke.
 */
export interface SignalStrokes {
  spanSeconds: number
  strokes: readonly SignalStroke[]
}

function assertPositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero, got ${value}`)
  }
}

/**
 * Counts how many tones a pattern has.
 *
 * With `repeatCount` that is the count itself. With `totalDurationSeconds` it is the number of
 * whole tones that fit, where a pause separates two tones and none follows the last one.
 */
function countTones(pattern: SignalPattern): number {
  if (pattern.repeatCount !== undefined) {
    if (!Number.isInteger(pattern.repeatCount) || pattern.repeatCount < 1) {
      throw new RangeError(`repeatCount must be a whole number of at least 1`)
    }
    return pattern.repeatCount
  }
  assertPositive(pattern.totalDurationSeconds, "totalDurationSeconds")
  const cycle = pattern.toneSeconds + pattern.pauseSeconds
  const count = Math.floor(
    (pattern.totalDurationSeconds + pattern.pauseSeconds) / cycle + FIT_TOLERANCE
  )
  if (count < 1) {
    throw new RangeError("totalDurationSeconds is shorter than one tone")
  }
  return count
}

/**
 * Lays out the tones of an outdoor warning signal for drawing.
 *
 * Pure and free of rendering, so the number, lengths and positions of the strokes can be tested
 * apart from the SVG. Each tone becomes one stroke as long as `toneSeconds`, and consecutive
 * strokes are `pauseSeconds` apart.
 *
 * @param pattern The signal's structured timing.
 * @returns The strokes and the span they cover.
 * @throws {RangeError} If `toneSeconds` is not greater than zero, `pauseSeconds` is negative,
 * `repeatCount` is not a whole number of at least 1, or `totalDurationSeconds` is too short for
 * one tone. The content tests run every bundled signal through this function, so invalid timing
 * fails the tests instead of drawing a misleading pattern.
 */
export function computeSignalStrokes(pattern: SignalPattern): SignalStrokes {
  assertPositive(pattern.toneSeconds, "toneSeconds")
  if (!Number.isFinite(pattern.pauseSeconds) || pattern.pauseSeconds < 0) {
    throw new RangeError(`pauseSeconds must be zero or greater, got ${pattern.pauseSeconds}`)
  }

  const count = countTones(pattern)
  const cycle = pattern.toneSeconds + pattern.pauseSeconds
  const strokes = Array.from({ length: count }, (_, index) => ({
    startSeconds: index * cycle,
    lengthSeconds: pattern.toneSeconds,
  }))
  const spanSeconds = count * pattern.toneSeconds + (count - 1) * pattern.pauseSeconds

  return { spanSeconds, strokes }
}
