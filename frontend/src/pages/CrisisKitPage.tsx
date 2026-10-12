import { useEffect, useState } from "react"
import CrisisKitItem from "../components/CrisisKitItem"
import { getCrisisKitItems } from "../services/crisisKitService"
import { CRISIS_KIT_CATEGORIES } from "../types/crisisKit"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"

/**
 * Lists emergency-kit items grouped into collapsible categories
 * and optional subsections.
 */
function CrisisKitPage() {
  const [items, setItems] = useState<CrisisKitItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadItems() {
      try {
        const loadedItems = await getCrisisKitItems()
        setItems(loadedItems)
      } catch {
        setError("Det gick inte att läsa in din krislåda. Försök igen.")
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [])

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Min krislåda
      </h1>

      <p className="mt-2 text-slate-600">
        Här ser du rekommenderade saker för din hemberedskap och vad du behöver lägga till.
      </p>

      {isLoading && (
        <p className="mt-6 text-slate-600" role="status">
          Läser in din krislåda...
        </p>
      )}

      {error && (
        <p className="mt-6 font-medium text-red-800" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="mt-6 space-y-4">
          {CRISIS_KIT_CATEGORIES.map((category) => {
            const categoryItems = items.filter((item) => item.category === category)

            const subcategories = [
              ...new Set(
                categoryItems
                  .map((item) => item.subcategory)
                  .filter((subcategory): subcategory is string => Boolean(subcategory))
              ),
            ]

            const uncategorizedItems = categoryItems.filter((item) => !item.subcategory)

            return (
              <details
                key={category}
                className="group rounded-2xl border border-blue-200/80 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 font-semibold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:p-5">
                  <span>{category}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>

                <div className="space-y-6 border-t border-slate-100 p-4 sm:p-5">
                  {categoryItems.length === 0 && (
                    <p className="text-sm text-slate-600">Inga saker i den här kategorin ännu.</p>
                  )}

                  {subcategories.map((subcategory) => {
                    const subcategoryItems = categoryItems.filter(
                      (item) => item.subcategory === subcategory
                    )

                    return (
                      <section key={subcategory}>
                        <h3 className="mb-3 text-base font-semibold text-blue-900">
                          {subcategory}
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {subcategoryItems.map((item) => (
                            <CrisisKitItem key={item.id} item={item} />
                          ))}
                        </div>
                      </section>
                    )
                  })}

                  {uncategorizedItems.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {uncategorizedItems.map((item) => (
                        <CrisisKitItem key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CrisisKitPage
