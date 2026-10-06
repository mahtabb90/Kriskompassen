import { Link } from "react-router-dom"
import type { CrisisItem } from "../types/crisis"
import OfflineToggle from "./OfflineToggle"

interface CrisisCardProps {
  item: CrisisItem
  onToggle?: (saved: boolean) => void
}

/**
 * Renders a crisis information item with its title, short description and offline controls.
 *
 * Links to the item's detail view using its unique ID. The offline toggle sits outside the
 * link so that no interactive element is nested inside another.
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
      <Link to={`/crisis/${item.id}`} className="flex flex-1 flex-col p-6 pb-4 sm:p-7 sm:pb-4">
        <h2 className="text-xl font-bold text-blue-900">{item.title}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{item.description}</p>
      </Link>
      <div className="px-6 pb-6 sm:px-7 sm:pb-7">
        <OfflineToggle item={item} onToggle={onToggle} />
      </div>
    </div>
  )
}

export default CrisisCard
