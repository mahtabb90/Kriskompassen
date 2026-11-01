import type { ReactNode } from "react"

export type CalmIconName = "pause" | "breath" | "steps" | "support"

const ICON_SHAPES: Record<CalmIconName, ReactNode> = {
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  breath: (
    <>
      <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),
  steps: (
    <>
      <path d="M3 20h5v-4h5v-4h4" />
      <path d="M14.5 6l2.5 2.5L22 3.5" />
    </>
  ),
  support: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M3 19c0-3 2-5 5-5s5 2 5 5" />
      <path d="M11 19c0-3 2-5 5-5s5 2 5 5" />
    </>
  ),
}

interface CalmIconProps {
  name: CalmIconName
  className?: string
}

/**
 * Renders a decorative outline icon for a card on the "Lugn i kris" page.
 *
 * It shares the style of `CrisisIcon` (24×24 viewBox, 1.8 stroke, `currentColor`) but has its own
 * names, so the article and emergency-kit icon mapping stays separate. The icon repeats the
 * adjacent heading, so it is hidden from assistive technology and cannot receive focus.
 *
 * @param name Which icon to draw.
 * @param className Extra classes, e.g. to set the colour.
 */
function CalmIcon({ name, className = "" }: CalmIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-6 shrink-0 ${className}`}
    >
      {ICON_SHAPES[name]}
    </svg>
  )
}

export default CalmIcon
