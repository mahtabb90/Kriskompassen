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
      className="block bg-white p-4 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <h2 className="text-xl font-bold text-blue-900">{item.title}</h2>
      <p>{item.description}</p>
    </Link>
  )
}

export default CrisisCard