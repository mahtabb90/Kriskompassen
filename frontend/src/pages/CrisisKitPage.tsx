import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import CrisisKitItem from "../components/CrisisKitItem"
import {
  addCustomCrisisKitItem,
  deleteCustomCrisisKitItem,
  getCrisisKitItems,
  updateCrisisKitItem,
  updateCustomCrisisKitItem,
  updateCustomCrisisKitItemOwnership,
} from "../services/crisisKitService"
import { CRISIS_KIT_CATEGORIES } from "../types/crisisKit"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"

function CrisisKitPage() {
  const [items, setItems] = useState<CrisisKitItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] =
    useState<(typeof CRISIS_KIT_CATEGORIES)[number]>("Övrigt")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [addItemError, setAddItemError] = useState<string | null>(null)

  useEffect(() => {
    async function loadItems() {
      try {
        setItems(await getCrisisKitItems())
      } catch {
        setError("Det gick inte att läsa in din krislåda. Försök igen.")
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [])

  async function handleOwnershipChange(item: CrisisKitItemType, isOwned: boolean) {
    if (item.isCustom) {
      await updateCustomCrisisKitItemOwnership(item.id, isOwned)
    } else {
      await updateCrisisKitItem(item.id, { isOwned })
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, isOwned } : currentItem
      )
    )
  }

  async function handleExpirationDateSave(item: CrisisKitItemType, expirationDate: string | null) {
    if (item.isCustom) {
      await updateCustomCrisisKitItem(item.id, item.name, item.category, expirationDate)
    } else {
      await updateCrisisKitItem(item.id, { expirationDate })
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) {
          return currentItem
        }

        const updatedItem = { ...currentItem }

        if (expirationDate) {
          updatedItem.expirationDate = expirationDate
        } else {
          delete updatedItem.expirationDate
        }

        return updatedItem
      })
    )
  }

  async function handleCustomItemSave(
    item: CrisisKitItemType,
    name: string,
    category: CrisisKitItemType["category"]
  ) {
    await updateCustomCrisisKitItem(item.id, name, category, item.expirationDate)

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, name: name.trim(), category } : currentItem
      )
    )
  }

  async function handleCustomItemDelete(item: CrisisKitItemType) {
    await deleteCustomCrisisKitItem(item.id)
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAddingItem(true)
    setAddItemError(null)

    try {
      const newItem = await addCustomCrisisKitItem(newItemName, newItemCategory)
      setItems((currentItems) => [...currentItems, newItem])
      setNewItemName("")
      setNewItemCategory("Övrigt")
    } catch (error) {
      setAddItemError(
        error instanceof Error ? error.message : "Det gick inte att lägga till saken. Försök igen."
      )
    } finally {
      setIsAddingItem(false)
    }
  }

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Min krislåda
      </h1>

      <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
        Håll koll på vad du har hemma inför en kris. Markera vad du har och lägg till egna saker.
      </p>
      <p className="mt-2 max-w-prose text-lg leading-relaxed text-slate-700">
        Ange utgångsdatum för att hålla koll på när saker behöver kontrolleras eller bytas ut.
      </p>

      <form
        onSubmit={handleAddItem}
        className="relative mt-6 overflow-hidden rounded-2xl border border-blue-200/80 bg-white p-6 pt-7 shadow-sm"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1.5">
          <span className="h-full flex-1 bg-blue-900" />
          <span className="h-full w-8 bg-amber-400" />
        </span>
        <h2 className="text-xl font-semibold text-blue-900">Lägg till en egen sak</h2>

        <div className="mt-4">
          <label htmlFor="new-item-name" className="block text-sm font-medium text-slate-700">
            Namn
          </label>
          <input
            id="new-item-name"
            type="text"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            maxLength={200}
            required
            disabled={isAddingItem}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="new-item-category" className="block text-sm font-medium text-slate-700">
            Kategori
          </label>
          <select
            id="new-item-category"
            value={newItemCategory}
            onChange={(event) =>
              setNewItemCategory(event.target.value as (typeof CRISIS_KIT_CATEGORIES)[number])
            }
            disabled={isAddingItem}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {CRISIS_KIT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {addItemError && (
          <p className="mt-3 text-sm font-medium text-red-800" role="alert">
            {addItemError}
          </p>
        )}

        <button
          type="submit"
          disabled={isAddingItem || !newItemName.trim()}
          className="mt-4 min-h-11 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAddingItem ? "Lägger till..." : "Lägg till sak"}
        </button>
      </form>

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
            const recommendedItems = categoryItems.filter((item) => !item.isCustom)
            const customItems = categoryItems.filter((item) => item.isCustom)

            const subcategories = [
              ...new Set(
                recommendedItems
                  .map((item) => item.subcategory)
                  .filter((subcategory): subcategory is string => Boolean(subcategory))
              ),
            ]

            return (
              <details
                key={category}
                className="group overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm"
              >
                <summary
                  // The card clips overflow, so the focus outline is drawn inside the summary instead.
                  className="relative flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 pt-5 font-semibold text-blue-900 focus-visible:-outline-offset-4 sm:p-5 sm:pt-6"
                >
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1.5">
                    <span className="h-full flex-1 bg-blue-900" />
                    <span className="h-full w-8 bg-amber-400" />
                  </span>
                  <h2 className="text-lg font-semibold">{category}</h2>
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

                  {recommendedItems.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-lg font-semibold text-blue-900">
                        Rekommenderade saker
                      </h3>

                      <div className="space-y-3">
                        {subcategories.map((subcategory) => {
                          const subcategoryItems = recommendedItems.filter(
                            (item) => item.subcategory === subcategory
                          )

                          return (
                            <details
                              key={subcategory}
                              className="group rounded-xl border border-blue-100 bg-slate-50"
                            >
                              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 font-semibold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                                <h4 className="text-base font-semibold">{subcategory}</h4>
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 text-lg transition-transform group-open:rotate-180"
                                >
                                  ▾
                                </span>
                              </summary>

                              <div className="grid gap-4 border-t border-blue-100 p-4 sm:grid-cols-2">
                                {subcategoryItems.map((item) => (
                                  <CrisisKitItem
                                    key={item.id}
                                    item={item}
                                    headingLevel={4}
                                    onOwnershipChange={handleOwnershipChange}
                                    onExpirationDateSave={handleExpirationDateSave}
                                    onCustomItemSave={handleCustomItemSave}
                                    onCustomItemDelete={handleCustomItemDelete}
                                  />
                                ))}
                              </div>
                            </details>
                          )
                        })}

                        {recommendedItems.some((item) => !item.subcategory) && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {recommendedItems
                              .filter((item) => !item.subcategory)
                              .map((item) => (
                                <CrisisKitItem
                                  key={item.id}
                                  item={item}
                                  onOwnershipChange={handleOwnershipChange}
                                  onExpirationDateSave={handleExpirationDateSave}
                                  onCustomItemSave={handleCustomItemSave}
                                  onCustomItemDelete={handleCustomItemDelete}
                                />
                              ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {customItems.length > 0 && (
                    <section>
                      <h3 className="mb-4 text-lg font-semibold text-blue-900">Egna saker</h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {customItems.map((item) => (
                          <CrisisKitItem
                            key={item.id}
                            item={item}
                            headingLevel={4}
                            onOwnershipChange={handleOwnershipChange}
                            onExpirationDateSave={handleExpirationDateSave}
                            onCustomItemSave={handleCustomItemSave}
                            onCustomItemDelete={handleCustomItemDelete}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}

      <section
        aria-labelledby="crisis-kit-sources-heading"
        className="mt-10 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 id="crisis-kit-sources-heading" className="text-lg font-semibold text-blue-900">
          Källor
        </h2>
        <p className="mt-3 text-slate-700">
          De rekommenderade sakerna i krislådan bygger på information från följande källor:
        </p>
        <ul className="mt-4 space-y-3">
          <li>
            <a
              href="https://www.krisinformation.se/din-beredskap/hemberedskap/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Krisinformation.se – Hemberedskap (öppnas i ny flik)
            </a>
          </li>
          <li>
            <a
              href="https://www.mcf.se/sv/publikationer/om-krisen-eller-kriget-kommer/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Myndigheten för civilt försvar – Om krisen eller kriget kommer (öppnas i ny flik)
            </a>
          </li>
        </ul>

        <p className="mt-3 text-sm text-slate-600">Länkarna kräver internetanslutning.</p>
      </section>
    </section>
  )
}

export default CrisisKitPage
