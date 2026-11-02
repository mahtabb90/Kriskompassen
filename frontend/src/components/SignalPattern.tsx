import type { SignalPattern as SignalPatternData } from "../types/krisinfo"
import { computeSignalStrokes, formatSignalSeconds } from "../utils/signalPattern"

// Pixel geometry; only horizontal positions are percentages of the timeline.
const SVG_HEIGHT = 16
const TRACK_Y = 6
const TRACK_HEIGHT = 4
const TONE_Y = 3
const TONE_HEIGHT = 10

function percentOf(seconds: number, timelineSeconds: number): string {
  return `${(seconds / timelineSeconds) * 100}%`
}

interface SignalPatternProps {
  pattern: SignalPatternData
  className?: string
}

/**
 * Draws a warning signal's pattern as a timeline: a thin light track for the whole duration,
 * one rounded (pill-shaped) stroke per tone on top of it, and the start and end times below.
 *
 * The strokes come from `computeSignalStrokes`. Each signal uses its own time scale, from 0 to
 * `timelineSeconds`, so the short tones of one signal stay as visible as the long tones of
 * another, and the end label matches the duration the content's text gives. The SVG has no
 * `viewBox`: horizontal positions are percentages of the available width and heights and corner
 * radii are pixels, so the strokes keep their rounded shape at every width instead of being
 * stretched.
 *
 * Decorative: the drawing and its labels are hidden from assistive technology, because the
 * visible pattern description carries the same information. Tones use `currentColor` in
 * `text-blue-900` on a `blue-200` track, never red, which is reserved for VMA warnings.
 *
 * @param props.pattern The signal's structured timing.
 * @param props.className Extra classes for the wrapper, e.g. width or spacing.
 * @throws {RangeError} If the pattern is invalid, as `computeSignalStrokes` does.
 */
function SignalPattern({ pattern, className = "" }: SignalPatternProps) {
  const { timelineSeconds, strokes } = computeSignalStrokes(pattern)

  return (
    <div aria-hidden="true" className={className}>
      <svg
        aria-hidden="true"
        focusable="false"
        height={SVG_HEIGHT}
        className="block w-full overflow-visible text-blue-900"
      >
        <rect
          x="0"
          y={TRACK_Y}
          width="100%"
          height={TRACK_HEIGHT}
          rx={TRACK_HEIGHT / 2}
          className="fill-blue-200"
        />
        <g fill="currentColor">
          {strokes.map((stroke) => (
            <rect
              key={stroke.startSeconds}
              x={percentOf(stroke.startSeconds, timelineSeconds)}
              y={TONE_Y}
              width={percentOf(stroke.lengthSeconds, timelineSeconds)}
              height={TONE_HEIGHT}
              rx={TONE_HEIGHT / 2}
            />
          ))}
        </g>
      </svg>
      <div className="mt-1 flex justify-between gap-4 text-sm whitespace-nowrap text-slate-600">
        <span>{formatSignalSeconds(0)}</span>
        <span>{formatSignalSeconds(timelineSeconds)}</span>
      </div>
    </div>
  )
}

export default SignalPattern
