import type { CrisisItem } from "../types/crisis"

interface CrisisCardProps {
  item: CrisisItem
}

/**
 * Renders a single crisis information item with its title and short description.
 *
 * @param item The crisis information to display.
 */
function CrisisCard({ item }: CrisisCardProps) {
  return (
    <article className="bg-white p-4 shadow-md">
      <h2 className="text-xl font-bold text-blue-900">{item.title}</h2>
      <p>{item.description}</p>
    </article>
  )
}

export default CrisisCard