interface SignalIconProps {
  className?: string
}

/**
 * Renders a decorative loudspeaker with sound waves, drawn before a warning signal's pattern.
 *
 * It shares the style of `CrisisIcon` and `CalmIcon` (24×24 viewBox, 1.8 stroke,
 * `currentColor`) and is drawn for this app, not copied from any authority's graphics. The
 * signal's name and pattern description carry the information, so the icon is hidden from
 * assistive technology and cannot receive focus.
 *
 * @param className Extra classes, e.g. to set the colour.
 */
function SignalIcon({ className = "" }: SignalIconProps) {
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
      <path d="M3.5 9.5h3.5l4.5-4v13l-4.5-4H3.5z" />
      <path d="M15 9a4.2 4.2 0 0 1 0 6" />
      <path d="M18 6.5a7.8 7.8 0 0 1 0 11" />
    </svg>
  )
}

export default SignalIcon
