import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import CrisisIcon from "../components/CrisisIcon"
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
import { RECOMMENDED_CRISIS_KIT } from "../data/recommendedCrisisKit"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"
import { iconForKitCategory } from "../utils/crisisIcons"
import { formatExpirationDate, getExpirationStatus } from "../utils/expirationDate"

function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function CardAccent() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 top-0 flex h-1.5 overflow-hidden rounded-t-2xl"
    >
      <span className="h-full flex-1 bg-blue-900" />
      <span className="h-full w-8 bg-amber-400" />
    </span>
  )
}

function CrisisKitPage() {
  const [items, setItems] = useState<CrisisKitItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] =
    useState<(typeof CRISIS_KIT_CATEGORIES)[number]>("Övrigt")
  const [newItemSubcategory, setNewItemSubcategory] = useState("Övrigt")
  const availableSubcategories = Array.from(
    new Set(
      RECOMMENDED_CRISIS_KIT.filter((item) => item.category === newItemCategory)
        .map((item) => item.subcategory)
        .filter((subcategory): subcategory is string => Boolean(subcategory))
    )
  ).sort((a, b) => a.localeCompare(b, "sv"))
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [addItemError, setAddItemError] = useState<string | null>(null)
  const [addItemMessage, setAddItemMessage] = useState<string | null>(null)

  const today = getTodayDateString()
  const itemsToReview = items
    .filter((item) => item.isOwned && item.expirationDate)
    .map((item) => ({
      item,
      status: getExpirationStatus(item.expirationDate, today),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: CrisisKitItemType & { expirationDate: string }
        status: "expired" | "soon"
      } => entry.status === "expired" || entry.status === "soon"
    )

  const expiredItems = itemsToReview
    .filter((entry) => entry.status === "expired")
    .sort((a, b) => a.item.expirationDate.localeCompare(b.item.expirationDate))
  const soonItems = itemsToReview
    .filter((entry) => entry.status === "soon")
    .sort((a, b) => a.item.expirationDate.localeCompare(b.item.expirationDate))
  const totalItemsToReview = expiredItems.length + soonItems.length

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
    setAddItemMessage(null)
    const shouldClearExpirationDate = !isOwned && Boolean(item.expirationDate)

    if (item.isCustom) {
      if (shouldClearExpirationDate) {
        await updateCustomCrisisKitItem(item.id, item.name, item.category, null)
      } else {
        await updateCustomCrisisKitItemOwnership(item.id, isOwned)
      }
    } else {
      await updateCrisisKitItem(
        item.id,
        shouldClearExpirationDate ? { isOwned, expirationDate: null } : { isOwned }
      )
    }

    setItems((currentItems) =>
      currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) {
          return currentItem
        }

        const updatedItem = { ...currentItem, isOwned }

        if (shouldClearExpirationDate) {
          delete updatedItem.expirationDate
        }

        return updatedItem
      })
    )
  }

  async function handleNotNeededChange(item: CrisisKitItemType, isNotNeeded: boolean) {
    setAddItemMessage(null)

    await updateCrisisKitItem(item.id, { isNotNeeded })

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              isNotNeeded,
              isOwned: isNotNeeded ? false : currentItem.isOwned,
            }
          : currentItem
      )
    )
  }

  async function handleExpirationDateSave(item: CrisisKitItemType, expirationDate: string | null) {
    setAddItemMessage(null)

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
    setAddItemMessage(null)

    await updateCustomCrisisKitItem(item.id, name, category, item.expirationDate)

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, name: name.trim(), category } : currentItem
      )
    )
  }

  async function handleCustomItemDelete(item: CrisisKitItemType) {
    setAddItemMessage(null)

    await deleteCustomCrisisKitItem(item.id)
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAddingItem(true)
    setAddItemError(null)
    setAddItemMessage(null)

    try {
      const newItem = await addCustomCrisisKitItem(
        newItemName,
        newItemCategory,
        newItemSubcategory === "Övrigt" ? undefined : newItemSubcategory
      )
      setItems((currentItems) => [...currentItems, newItem])
      setAddItemMessage("Saken har lagts till i din krislåda.")
      setNewItemName("")
      setNewItemCategory("Övrigt")
      setNewItemSubcategory("Övrigt")
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
        Håll koll på vad du har hemma inför en kris. Markera vad du har, vad du inte behöver och
        lägg till egna saker.
      </p>
      <p className="mt-2 max-w-prose text-lg leading-relaxed text-slate-700">
        Ange utgångsdatum för att hålla koll på när saker behöver kontrolleras eller bytas ut.
      </p>

      {totalItemsToReview > 0 && (
        <section
          aria-label="Utgångsdatum att se över"
          className="relative mt-6 overflow-hidden rounded-2xl border border-blue-200/80 bg-white p-5 pt-7 shadow-sm sm:p-6 sm:pt-8"
        >
          <CardAccent />
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-900"
            >
              <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
                <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3.5" />
                <path d="M24 14v12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <circle cx="24" cy="33" r="2.2" fill="currentColor" />
              </svg>
            </span>
            <p className="min-w-0 flex-1 text-lg font-bold text-slate-700 sm:text-xl">
              <span className="text-2xl tabular-nums sm:text-3xl">{totalItemsToReview}</span> saker
              att se över
            </p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-3 py-2">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"
              >
                <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
                  {/* Bell body */}
                  <path
                    d="M24 8
                    C17 8 13 14 13 22
                    V29
                    C13 33 11 36 8 39
                    H40
                    C37 36 35 33 35 29
                    V22
                    C35 14 31 8 24 8Z"
                    fill="currentColor"
                  />

                  {/* Top knob */}
                  <circle cx="24" cy="7" r="2.5" fill="currentColor" />

                  {/* Clapper */}
                  <path
                    d="M19 41
                    C20 44 22 45 24 45
                    C26 45 28 44 29 41Z"
                    fill="currentColor"
                  />

                  {/* Ringing lines */}
                  <path
                    d="M7 13 C2 21 2 29 7 36
                    M41 13 C46 21 46 29 41 36"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11 18 C8 23 8 27 11 32
                    M37 18 C40 23 40 27 37 32"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="flex flex-wrap items-baseline justify-center gap-x-2">
                <p className="text-3xl font-bold tabular-nums text-slate-900">
                  {expiredItems.length}
                </p>
                <p className="font-semibold text-slate-700">utgångna varor</p>
              </div>
            </div>

            <div className="flex min-h-20 items-center justify-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/70 px-3 py-2">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600"
              >
                <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
                  <circle cx="22" cy="23" r="16" stroke="currentColor" strokeWidth="3.5" />
                  <path
                    d="M22 13v11l8 5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="flex flex-wrap items-baseline justify-center gap-x-2">
                <p className="text-3xl font-bold tabular-nums text-slate-900">{soonItems.length}</p>
                <p className="font-semibold text-slate-700">varor går snart ut</p>
              </div>
            </div>
          </div>

          <details className="expiration-review group mt-4 rounded-2xl border border-blue-200">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl bg-blue-50 px-4 py-2 font-semibold text-blue-900 marker:hidden [&::-webkit-details-marker]:hidden focus-visible:outline-3 focus-visible:outline-blue-900 focus-visible:outline-offset-4">
              <span>Visa varor att se över</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl leading-none transition-transform group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>

            <div className="space-y-6 p-4">
              {totalItemsToReview === 0 && (
                <p className="text-sm text-slate-600">Det finns inga varor att se över just nu.</p>
              )}

              {expiredItems.length > 0 && (
                <section aria-labelledby="expired-items-heading">
                  <h3
                    id="expired-items-heading"
                    className="mb-3 text-lg font-semibold text-slate-900"
                  >
                    Utgången ({expiredItems.length})
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-slate-200">
                    {expiredItems.map(({ item }, index) => (
                      <li
                        key={item.id}
                        className={`flex min-w-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 ${
                          index > 0 ? "border-t border-slate-200" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center text-red-600"
                          >
                            <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
                              {/* Bell body */}
                              <path
                                d="M24 8
                                C17 8 13 14 13 22
                                V29
                                C13 33 11 36 8 39
                                H40
                                C37 36 35 33 35 29
                                V22
                                C35 14 31 8 24 8Z"
                                fill="currentColor"
                              />

                              {/* Top knob */}
                              <circle cx="24" cy="7" r="2.5" fill="currentColor" />

                              {/* Clapper */}
                              <path
                                d="M19 41
                                C20 44 22 45 24 45
                                C26 45 28 44 29 41Z"
                                fill="currentColor"
                              />

                              {/* Ringing lines */}
                              <path
                                d="M7 13 C2 21 2 29 7 36
                                M41 13 C46 21 46 29 41 36"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <path
                                d="M11 18 C8 23 8 27 11 32
                                M37 18 C40 23 40 27 37 32"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-0.5 h-12 w-px shrink-0 bg-slate-200"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-semibold text-slate-900">
                              {item.name}
                            </span>
                            <span className="block text-sm text-slate-600">
                              {item.category}
                              {item.subcategory ? ` · ${item.subcategory}` : ""}
                            </span>
                          </span>
                        </div>
                        <span className="pl-[4.0625rem] text-left sm:ml-auto sm:shrink-0 sm:pl-0 sm:text-right">
                          <span className="block text-sm font-semibold text-red-600 sm:text-base">
                            {formatExpirationDate(item.expirationDate)}
                          </span>
                          <span className="block text-sm text-slate-600">Utgången</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {soonItems.length > 0 && (
                <section aria-labelledby="soon-items-heading">
                  <h3 id="soon-items-heading" className="mb-3 text-lg font-semibold text-slate-900">
                    Går snart ut ({soonItems.length})
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-slate-200">
                    {soonItems.map(({ item }, index) => (
                      <li
                        key={item.id}
                        className={`flex min-w-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 ${
                          index > 0 ? "border-t border-slate-200" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center text-orange-600"
                          >
                            <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
                              <circle
                                cx="22"
                                cy="23"
                                r="16"
                                stroke="currentColor"
                                strokeWidth="3.5"
                              />
                              <path
                                d="M22 13v11l8 5"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-0.5 h-12 w-px shrink-0 bg-slate-200"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-semibold text-slate-900">
                              {item.name}
                            </span>
                            <span className="block text-sm text-slate-600">
                              {item.category}
                              {item.subcategory ? ` · ${item.subcategory}` : ""}
                            </span>
                          </span>
                        </div>
                        <span className="pl-[4.0625rem] text-left sm:ml-auto sm:shrink-0 sm:pl-0 sm:text-right">
                          <span className="block text-sm font-semibold text-orange-700 sm:text-base">
                            {formatExpirationDate(item.expirationDate)}
                          </span>
                          <span className="block text-sm text-slate-600">Går snart ut</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </details>
        </section>
      )}

      <form
        onSubmit={handleAddItem}
        className="relative mt-6 overflow-hidden rounded-2xl border border-blue-200/80 bg-white p-6 pt-7 shadow-sm"
      >
        <CardAccent />
        <h2 className="text-xl font-semibold text-blue-900">Lägg till en egen sak</h2>

        <div className="mt-4">
          <label htmlFor="new-item-name" className="block text-sm font-medium text-slate-700">
            Namn
          </label>
          <input
            id="new-item-name"
            type="text"
            value={newItemName}
            onChange={(event) => {
              setNewItemName(event.target.value)
              setAddItemMessage(null)
            }}
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
            onChange={(event) => {
              setNewItemCategory(event.target.value as (typeof CRISIS_KIT_CATEGORIES)[number])
              setNewItemSubcategory("Övrigt")
              setAddItemMessage(null)
            }}
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

        <div className="mt-4">
          <label
            htmlFor="new-item-subcategory"
            className="block text-sm font-medium text-slate-700"
          >
            Underkategori
          </label>
          <select
            id="new-item-subcategory"
            value={newItemSubcategory}
            onChange={(event) => {
              setNewItemSubcategory(event.target.value)
              setAddItemMessage(null)
            }}
            disabled={isAddingItem}
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <option value="Övrigt">Övrigt</option>
            {availableSubcategories.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
        </div>

        {addItemError && (
          <p className="mt-3 text-sm font-medium text-red-800" role="alert">
            {addItemError}
          </p>
        )}

        {addItemMessage && (
          <p className="mt-3 text-sm font-medium text-green-800" role="status">
            <span aria-hidden="true" className="mr-2">
              ✓
            </span>
            {addItemMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isAddingItem || !newItemName.trim()}
          className="mt-4 min-h-11 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed"
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
            const subcategories = Array.from(
              new Set(categoryItems.map((item) => item.subcategory || "Övrigt"))
            ).sort((a, b) => a.localeCompare(b, "sv"))

            return (
              <details
                key={category}
                onToggle={(event) => {
                  const categoryDetails = event.currentTarget

                  if (event.target !== categoryDetails || !categoryDetails.open) return

                  categoryDetails
                    .querySelectorAll<HTMLDetailsElement>(".subcategory-group")
                    .forEach((subcategoryDetails) => {
                      subcategoryDetails.open = subcategoryDetails.dataset.hasActiveItems === "true"
                    })
                }}
                className="relative group overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm"
              >
                <CardAccent />
                <summary className="relative flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 pt-5 font-semibold text-blue-900 focus-visible:outline-3 focus-visible:outline-blue-900 focus-visible:outline-offset-4 sm:p-5 sm:pt-6">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 flex h-1.5 overflow-hidden rounded-t-2xl"
                  >
                    <span className="h-full flex-1 bg-blue-900" />
                    <span className="h-full w-8 bg-amber-400" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <CrisisIcon name={iconForKitCategory(category)} className="text-blue-900" />
                    <h2 className="min-w-0 text-lg font-semibold">{category}</h2>
                  </span>
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
                  <div className="space-y-3">
                    {subcategories.map((subcategory) => {
                      const subcategoryItems = categoryItems
                        .filter((item) => (item.subcategory || "Övrigt") === subcategory)
                        .sort((a, b) => a.name.localeCompare(b.name, "sv"))

                      return (
                        <details
                          key={subcategory}
                          data-has-active-items={subcategoryItems.some((item) => !item.isNotNeeded)}
                          className="subcategory-group rounded-xl border border-blue-100 bg-slate-50"
                        >
                          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 font-semibold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                            <h3 className="text-base font-semibold">{subcategory}</h3>
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-lg transition-transform [details.subcategory-group[open]_&]:rotate-180"
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
                                onNotNeededChange={handleNotNeededChange}
                                onExpirationDateSave={handleExpirationDateSave}
                                onCustomItemSave={handleCustomItemSave}
                                onCustomItemDelete={handleCustomItemDelete}
                              />
                            ))}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      )}

      <section
        aria-labelledby="crisis-kit-sources-heading"
        className="relative mt-10 overflow-hidden rounded-2xl border border-blue-200/80 bg-white p-6 pt-8 shadow-sm sm:p-8 sm:pt-10"
      >
        <CardAccent />
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
