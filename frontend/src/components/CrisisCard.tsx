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
        className="flex flex-1 flex-col p-6 pb-4 focus-visible:-outline-offset-4 sm:p-7 sm:pb-4"
      >
        <div className="flex items-start gap-3">
          <CrisisIcon name={iconForArticleId(item.id)} className="mt-0.5 text-blue-900" />
          <h2 className="min-w-0 flex-1 text-xl font-bold text-blue-900">{item.title}</h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{item.description}</p>
      </Link>
      <div className="px-6 pb-3 sm:px-7 sm:pb-4">
        <OfflineToggle
          item={item}
          onToggle={onToggle}
          actions={
            <Link
              to={`/crisis/${item.id}`}
              aria-label={`Läs mer om ${item.title}`}
              className="ml-auto inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
            >
              Läs mer
            </Link>
          }
        />
      </div>
    </div>
  )
}

export default CrisisCard
