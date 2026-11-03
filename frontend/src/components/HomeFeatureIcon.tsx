import type { ReactNode } from "react"

export type HomeFeatureIconName = "info" | "shelter" | "location" | "phone"

const ICON_SHAPES: Record<HomeFeatureIconName, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  shelter: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
}

interface HomeFeatureIconProps {
  name: HomeFeatureIconName
  className?: string
}

/**
 * Renders a decorative outline icon for a home page feature card or a krisinfo overview card that
 * has no equivalent in `CrisisIcon`, `CalmIcon` or `SignalIcon`.
 *
 * It shares their style (24×24 viewBox, 1.8 stroke, `currentColor`). The icon repeats the adjacent
 * card title, so it is hidden from assistive technology and cannot receive focus.
 *
 * @param name Which icon to draw.
 * @param className Extra classes, e.g. to set the colour.
 */
function HomeFeatureIcon({ name, className = "" }: HomeFeatureIconProps) {
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

export default HomeFeatureIcon
