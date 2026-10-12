import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"

interface CrisisKitItemProps {
  item: CrisisKitItemType
}

/**
 * Displays an emergency-kit item and its current ownership status.
 */
function CrisisKitItem({ item }: CrisisKitItemProps) {
  const today = new Date()
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-")

  const isExpired = item.expirationDate !== undefined && item.expirationDate < todayString

  return (
    <article className="rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-blue-900">{item.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{item.category}</p>
        </div>

        <span
          className={`shrink-0 rounded-lg border px-3 py-1 text-sm font-medium ${
            item.isOwned
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {item.isOwned ? "Har" : "Saknas"}
        </span>
      </div>

      {item.expirationDate && (
        <p className="mt-4 text-sm">
          <span className="font-medium text-slate-700">Utgångsdatum: </span>
          {new Date(`${item.expirationDate}T12:00:00`).toLocaleDateString("sv-SE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}

          {isExpired && (
            <span className="mt-2 block font-semibold text-red-800">
              Utgångsdatumet har passerat.
            </span>
          )}
        </p>
      )}
    </article>
  )
}

export default CrisisKitItem
