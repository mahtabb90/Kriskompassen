import type { SignalPattern as SignalPatternData } from "../types/krisinfo"
import { computeSignalStrokes } from "../utils/signalPattern"
import SignalIcon from "./SignalIcon"

// The drawing's own coordinate width; every signal is scaled to fill it.
const TIMELINE_WIDTH = 240
const TIMELINE_HEIGHT = 24
const STROKE_Y = 6
const STROKE_HEIGHT = 12

interface SignalPatternProps {
  pattern: SignalPatternData
  className?: string
}

/**
 * Draws a warning signal's pattern: a loudspeaker icon followed by one stroke per tone.
 *
 * Each stroke is as long as the tone and the gaps are as long as the pauses. Every signal uses
 * its own time scale, scaled from the first tone's start to the last tone's end, so the short
 * tones of one signal stay as visible as the long tones of another. The strokes come from
 * `computeSignalStrokes`. The timeline stretches horizontally to the available width at a fixed
 * height, so the strokes are plain rectangles that stay undistorted vertically.
 *
 * Decorative: the whole drawing is hidden from assistive technology, because the visible
 * pattern description carries the same information. It uses `currentColor` in `text-blue-900`
 * and never red, which is reserved for VMA warnings.
 *
 * @param props.pattern The signal's structured timing.
 * @param props.className Extra classes for the wrapper, e.g. spacing.
 * @throws {RangeError} If the pattern is invalid, as `computeSignalStrokes` does.
 */
function SignalPattern({ pattern, className = "" }: SignalPatternProps) {
  const { spanSeconds, strokes } = computeSignalStrokes(pattern)
  const scale = TIMELINE_WIDTH / spanSeconds

  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-900">
        <SignalIcon />
      </span>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-6 min-w-0 flex-1 text-blue-900"
      >
        {strokes.map((stroke) => (
          <rect
            key={stroke.startSeconds}
            x={stroke.startSeconds * scale}
            y={STROKE_Y}
            width={stroke.lengthSeconds * scale}
            height={STROKE_HEIGHT}
            fill="currentColor"
          />
        ))}
      </svg>
    </div>
  )
}

export default SignalPattern
