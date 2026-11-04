import { Link } from "react-router-dom"
import type { CrisisItem } from "../types/crisis"
import { iconForArticleId } from "../utils/crisisIcons"
import CrisisIcon from "./CrisisIcon"
import OfflineToggle from "./OfflineToggle"

interface CrisisCardProps {
  item: CrisisItem
  onToggle?: (saved: boolean) => void
}

/**
 * Renders a crisis information item with its title, short description and offline controls.
 *
 * Links to the item's detail view using its unique ID, both from the title/description and from
 * a separate "Läs mer" link in the action row. The offline toggle and the "Läs mer" link sit
 * outside the title link so that no interactive element is nested inside another.
 * Reading comes before the right-hand save/remove action. Both controls reserve the longer
 * removal label so their equal dimensions and wrapping stay stable across saved-state changes.
 * Horizontal padding is capped at its default pixel size so enlarged text retains room for
 * whole button-label words and focus outlines in narrow cards. The footer's grid gutters can
 * shrink further to fit the controls' intrinsic width, retaining at least 8px for focus outlines.
 *
 * @param item The crisis information to display.
 * @param onToggle Called after the item is saved or removed offline, with the new saved state.
 */
function CrisisCard({ item, onToggle }: CrisisCardProps) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-blue-400 hover:shadow-md">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
        <span className="h-full w-8 bg-amber-400" />
      </div>
      <Link
        to={`/crisis/${item.id}`}
        // The card clips overflow, so the focus outline is drawn inside the link instead.
        className="flex flex-1 flex-col px-[min(1.5rem,24px)] pt-6 pb-4 focus-visible:-outline-offset-4 sm:px-[min(1.75rem,28px)] sm:pt-7"
      >
        <div className="flex items-start gap-3">
          <CrisisIcon name={iconForArticleId(item.id)} className="mt-0.5 text-blue-900" />
          <h2 className="min-w-0 flex-1 text-xl font-bold text-blue-900">{item.title}</h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{item.description}</p>
      </Link>
      <div className="grid grid-cols-[minmax(8px,var(--card-padding))_minmax(min-content,1fr)_minmax(8px,var(--card-padding))] pb-3 [--card-padding:min(1.5rem,24px)] *:col-start-2 sm:pb-4 sm:[--card-padding:min(1.75rem,28px)]">
        <OfflineToggle
          item={item}
          onToggle={onToggle}
          actions={
            <Link
              to={`/crisis/${item.id}`}
              aria-label={`Läs mer om ${item.title}`}
              className="inline-grid min-h-12 min-w-min items-center justify-items-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-center font-semibold wrap-normal text-blue-900 hover:bg-blue-50"
            >
              <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
                Ta bort offlinekopia
              </span>
              <span className="col-start-1 row-start-1">Läs mer</span>
            </Link>
          }
        />
      </div>
    </div>
  )
}

export default CrisisCard
