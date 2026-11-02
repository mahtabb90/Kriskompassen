/**
 * Static decorative motif for the "Lugn i kris" hero: two light rings and a darker inner ring
 * holding a gentle wave, with one small amber dot as a focus point.
 *
 * Only three rings are drawn so it reads as stillness and breathing rather than a target. It
 * carries no information, so it is hidden from assistive technology, and it is not animated.
 *
 * @param className Extra classes, e.g. to set the size.
 */
function CalmHeroMotif({ className = "" }: { className?: string }) {
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
      <circle cx="80" cy="80" r="64" className="text-blue-200" />
      <circle cx="80" cy="80" r="44" className="text-blue-200" />
      <circle cx="80" cy="80" r="26" className="text-blue-900" />
      <path d="M54 80q6.5-9 13 0t13 0 13 0 13 0" className="text-blue-900" />
      <circle
        cx="125.3"
        cy="34.7"
        r="4"
        fill="currentColor"
        stroke="none"
        className="text-amber-400"
      />
    </svg>
  )
}

export default CalmHeroMotif
