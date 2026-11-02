/**
 * Static decorative motif for the home page hero: two radar-like rings, four directional ticks,
 * an abstract compass needle and one small amber focus point.
 *
 * It is deliberately not the logo: there is no dial, housing or lettering. It carries no
 * information, so it is hidden from assistive technology, and it is not animated.
 *
 * @param className Extra classes, e.g. to set the size or hide it on small viewports.
 */
function CompassHeroMotif({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="80" cy="80" r="64" strokeWidth="1.5" className="text-blue-200" />
      <circle cx="80" cy="80" r="44" className="text-blue-300" />
      <path d="M80 18v8M80 134v8M18 80h8M134 80h8" className="text-blue-900" />
      <g transform="rotate(35 80 80)" className="text-blue-900">
        {/* The longer, filled half points at the amber dot; the shorter half is outline only. */}
        <path d="M80 46 85.5 80H74.5z" fill="currentColor" />
        <path d="M80 106 85.5 80H74.5z" />
      </g>
      <circle cx="80" cy="80" r="4.5" className="fill-white text-blue-900" />
      <circle
        cx="105.2"
        cy="44"
        r="4.5"
        fill="currentColor"
        stroke="none"
        className="text-amber-400"
      />
    </svg>
  )
}

export default CompassHeroMotif
