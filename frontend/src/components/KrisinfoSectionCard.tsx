import { Link } from "react-router-dom"
import CalmIcon from "./CalmIcon"
import HomeFeatureIcon from "./HomeFeatureIcon"
import type { KrisinfoSection, KrisinfoSectionIcon } from "./krisinfoSections"
import SignalIcon from "./SignalIcon"

const ICON_CLASSES = "text-blue-900"

function renderIcon(icon: KrisinfoSectionIcon) {
  switch (icon) {
    case "info":
      return <HomeFeatureIcon name="info" className={ICON_CLASSES} />
    case "phone":
      return <HomeFeatureIcon name="phone" className={ICON_CLASSES} />
    case "signal":
      return <SignalIcon className={ICON_CLASSES} />
    case "calm":
      return <CalmIcon name="breath" className={ICON_CLASSES} />
  }
}

interface KrisinfoSectionCardProps {
  section: KrisinfoSection
}

/**
 * Shows one part of the krisinfo overview as a card that is a single link to that part's page.
 *
 * Presentational only: it renders the `section` it is given. It follows the home page's feature
 * cards: the link's accessible name is the `h2` title and its description is the card text. The
 * icon and the trailing "Öppna" cue are decoration hidden from assistive technology.
 *
 * @param section The part to link to.
 */
function KrisinfoSectionCard({ section }: KrisinfoSectionCardProps) {
  const { id, to, label, description, icon } = section
  const elementId = `krisinfo-section-${id}`

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-blue-400 hover:shadow-md">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
        <span className="h-full w-8 bg-amber-400" />
      </div>
      <Link
        to={to}
        aria-labelledby={`${elementId}-title`}
        aria-describedby={`${elementId}-description`}
        // The card clips overflow, so the focus outline is drawn inside the link instead.
        className="flex flex-1 flex-col p-6 focus-visible:-outline-offset-4"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50">
            {renderIcon(icon)}
          </span>
          <h2
            id={`${elementId}-title`}
            className="wrap-anywhere min-w-0 flex-1 text-xl font-bold text-blue-900"
          >
            {label}
          </h2>
        </div>
        <p
          id={`${elementId}-description`}
          className="mt-4 text-base leading-relaxed text-slate-600"
        >
          {description}
        </p>
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-2 pt-4 text-base font-semibold text-blue-900"
        >
          Öppna
          <svg
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 shrink-0"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </div>
  )
}

export default KrisinfoSectionCard
