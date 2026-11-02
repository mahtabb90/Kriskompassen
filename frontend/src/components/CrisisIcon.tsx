import type { ReactNode } from "react"
import type { CrisisIconName } from "../utils/crisisIcons"

const ICON_SHAPES: Record<CrisisIconName, ReactNode> = {
  food: (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18" />
      <path d="M17 21V3c-2 1.5-3 4-3 7v3h3" />
    </>
  ),
  water: <path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5z" />,
  hygiene: (
    <>
      <rect x="3" y="12" width="14" height="8" rx="2" />
      <circle cx="8" cy="7.5" r="2" />
      <circle cx="14" cy="5.5" r="1.5" />
      <circle cx="19" cy="9.5" r="1.5" />
    </>
  ),
  heat: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.5 1 2 2 2 0-3-.5-5 1-8z" />,
  communication: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M7 8l10-5" />
      <circle cx="8.5" cy="14" r="2.5" />
      <path d="M14 12.5h4M14 16h4" />
    </>
  ),
  medicine: (
    <g transform="rotate(-45 12 12)">
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" />
      <path d="M12 8.5v7" />
    </g>
  ),
  payment: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M6.5 15h4" />
    </>
  ),
  pets: (
    <>
      <path d="M12 20c-3 0-5-1.8-5-3.8 0-2.2 2.5-4.2 5-4.2s5 2 5 4.2c0 2-2 3.8-5 3.8z" />
      <circle cx="5.5" cy="10" r="1.6" />
      <circle cx="9.5" cy="6" r="1.6" />
      <circle cx="14.5" cy="6" r="1.6" />
      <circle cx="18.5" cy="10" r="1.6" />
    </>
  ),
  other: (
    <>
      <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" />
      <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
    </>
  ),
}

interface CrisisIconProps {
  name: CrisisIconName
  className?: string
}

/**
 * Renders a decorative outline icon that repeats the meaning of the adjacent heading.
 *
 * All icons share one style (24×24 viewBox, 1.8 stroke, `currentColor`). The icon is hidden from
 * assistive technology and cannot receive focus, so it never adds a second accessible name.
 *
 * @param name Which icon to draw.
 * @param className Extra classes, e.g. to set the colour or spacing.
 */
function CrisisIcon({ name, className = "" }: CrisisIconProps) {
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

export default CrisisIcon
