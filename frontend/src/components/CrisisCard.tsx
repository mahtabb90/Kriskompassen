import { Link } from "react-router-dom"
import type { CrisisItem } from "../types/crisis"

interface CrisisCardProps {
  item: CrisisItem
}

/**
 * Renders a crisis information item with its title and short description.
 *
 * Links to the item's detail view using its unique ID.
 *
 * @param item The crisis information to display.
 */
function CrisisCard({ item }: CrisisCardProps) {
  return (
    <Link
      to={`/crisis/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-blue-400 hover:shadow-md"
    >
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
        <span className="h-full w-8 bg-amber-400" />
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h2 className="text-xl font-bold text-blue-900">{item.title}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          {item.description}
        </p>
      </div>
    </Link>
  )
}

export default CrisisCard