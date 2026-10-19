import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"
import { CRISIS_KIT_CATEGORIES } from "../types/crisisKit"

interface CrisisKitItemProps {
  item: CrisisKitItemType
  headingLevel?: 3 | 4
  onOwnershipChange: (item: CrisisKitItemType, isOwned: boolean) => Promise<void>
  onExpirationDateSave: (item: CrisisKitItemType, expirationDate: string | null) => Promise<void>
  onCustomItemSave: (
    item: CrisisKitItemType,
    name: string,
    category: CrisisKitItemType["category"]
  ) => Promise<void>
  onCustomItemDelete: (item: CrisisKitItemType) => Promise<void>
}

function getTodayString(): string {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-")
}

function CrisisKitItem({
  item,
  headingLevel = 3,
  onOwnershipChange,
  onExpirationDateSave,
  onCustomItemSave,
  onCustomItemDelete,
}: CrisisKitItemProps) {
  const Heading = headingLevel === 4 ? "h4" : "h3"

  const [isSavingOwnership, setIsSavingOwnership] = useState(false)
  const [isSavingExpiration, setIsSavingExpiration] = useState(false)
  const [ownershipError, setOwnershipError] = useState<string | null>(null)
  const [expirationError, setExpirationError] = useState<string | null>(null)
  const [expirationMessage, setExpirationMessage] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState(item.expirationDate ?? "")
  const [isExpirationEditorOpen, setIsExpirationEditorOpen] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(item.name)
  const [editedCategory, setEditedCategory] = useState<CrisisKitItemType["category"]>(item.category)
  const [isSavingCustomItem, setIsSavingCustomItem] = useState(false)
  const [customItemError, setCustomItemError] = useState<string | null>(null)
  const [isDeletingCustomItem, setIsDeletingCustomItem] = useState(false)
  const [customItemDeleteError, setCustomItemDeleteError] = useState<string | null>(null)

  const todayString = getTodayString()
  const isExpired = item.expirationDate !== undefined && item.expirationDate < todayString
  const hasExpirationChanges = expirationDate !== (item.expirationDate ?? "")
  const expirationEditorId = `expiration-editor-${item.id}`

  async function handleOwnershipChange(event: ChangeEvent<HTMLInputElement>) {
    const isOwned = event.target.checked

    setIsSavingOwnership(true)
    setOwnershipError(null)

    try {
      await onOwnershipChange(item, isOwned)
    } catch {
      setOwnershipError("Det gick inte att spara ändringen. Försök igen.")
    } finally {
      setIsSavingOwnership(false)
    }
  }

  async function handleExpirationSave() {
    setIsSavingExpiration(true)
    setExpirationError(null)
    setExpirationMessage(null)

    try {
      await onExpirationDateSave(item, expirationDate || null)
      setExpirationMessage("Ändringen har sparats.")
    } catch {
      setExpirationError("Det gick inte att spara datumet. Kontrollera datumet och försök igen.")
    } finally {
      setIsSavingExpiration(false)
    }
  }

  function handleExpirationDateChange(event: ChangeEvent<HTMLInputElement>) {
    setExpirationDate(event.target.value)
    setExpirationError(null)
    setExpirationMessage(null)
  }

  function handleEditStart() {
    setEditedName(item.name)
    setEditedCategory(item.category)
    setCustomItemError(null)
    setIsEditing(true)
  }

  function handleEditCancel() {
    setEditedName(item.name)
    setEditedCategory(item.category)
    setCustomItemError(null)
    setIsEditing(false)
  }

  async function handleCustomItemSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingCustomItem(true)
    setCustomItemError(null)

    try {
      await onCustomItemSave(item, editedName, editedCategory)
      setIsEditing(false)
    } catch (error) {
      setCustomItemError(
        error instanceof Error ? error.message : "Det gick inte att spara ändringarna. Försök igen."
      )
    } finally {
      setIsSavingCustomItem(false)
    }
  }

  async function handleCustomItemDelete() {
    const confirmed = window.confirm(`Vill du ta bort "${item.name}" från din krislåda?`)

    if (!confirmed) {
      return
    }

    setIsDeletingCustomItem(true)
    setCustomItemDeleteError(null)

    try {
      await onCustomItemDelete(item)
    } catch (error) {
      setCustomItemDeleteError(
        error instanceof Error ? error.message : "Det gick inte att ta bort saken. Försök igen."
      )
    } finally {
      setIsDeletingCustomItem(false)
    }
  }

  return (
    <article className="rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm">
      {isEditing ? (
        <form onSubmit={handleCustomItemSave}>
          <h3 className="font-semibold text-blue-900">Redigera egen sak</h3>

          <div className="mt-4">
            <label
              htmlFor={`edit-name-${item.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              Namn
            </label>
            <input
              id={`edit-name-${item.id}`}
              type="text"
              value={editedName}
              onChange={(event) => setEditedName(event.target.value)}
              maxLength={200}
              required
              disabled={isSavingCustomItem}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor={`edit-category-${item.id}`}
              className="block text-sm font-medium text-slate-700"
            >
              Kategori
            </label>
            <select
              id={`edit-category-${item.id}`}
              value={editedCategory}
              onChange={(event) =>
                setEditedCategory(event.target.value as CrisisKitItemType["category"])
              }
              disabled={isSavingCustomItem}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {CRISIS_KIT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {customItemError && (
            <p className="mt-3 text-sm font-medium text-red-800" role="alert">
              {customItemError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSavingCustomItem || !editedName.trim()}
              className="min-h-11 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingCustomItem ? "Sparar..." : "Spara ändringar"}
            </button>
            <button
              type="button"
              onClick={handleEditCancel}
              disabled={isSavingCustomItem}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Heading className="font-semibold text-blue-900">{item.name}</Heading>
              <p className="mt-1 text-sm text-slate-600">{item.category}</p>
            </div>

            <span
              className={`shrink-0 rounded-lg border px-3 py-1 text-sm font-medium ${
                item.isOwned
                  ? "border-green-300 bg-green-100 text-green-800"
                  : "border-red-300 bg-red-100 text-red-800"
              }`}
            >
              {item.isOwned ? "Finns" : "Saknas"}
            </span>
          </div>

          {item.isCustom && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEditStart}
                disabled={isDeletingCustomItem}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redigera
              </button>
              <button
                type="button"
                onClick={handleCustomItemDelete}
                disabled={isDeletingCustomItem}
                className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingCustomItem ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          )}

          {customItemDeleteError && (
            <p className="mt-3 text-sm font-medium text-red-800" role="alert">
              {customItemDeleteError}
            </p>
          )}

          <div className="mt-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={item.isOwned}
                disabled={isSavingOwnership}
                onChange={handleOwnershipChange}
                className="size-5 accent-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              />
              <span className="text-sm font-medium text-slate-700">
                {isSavingOwnership ? "Sparar..." : "Jag har den här saken"}
              </span>
            </label>

            {ownershipError && (
              <p className="mt-2 text-sm font-medium text-red-800" role="alert">
                {ownershipError}
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsExpirationEditorOpen((isOpen) => !isOpen)}
              aria-expanded={isExpirationEditorOpen}
              aria-controls={expirationEditorId}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="size-5 shrink-0 text-blue-800"
              >
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
              </svg>

              <span className="min-w-0 flex-1">
                {item.expirationDate ? (
                  <>
                    <span className="block text-sm font-medium text-slate-500">
                      Kontrolldatum
                    </span>
                    <span className="block text-sm font-medium text-slate-800">
                      {item.expirationDate}
                    </span>
                    {isExpired && (
                      <span className="mt-0.5 block text-sm font-medium text-red-800">
                        Utgånget
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-medium text-blue-800">Lägg till kontrolldatum</span>
                )}
              </span>

              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`size-5 shrink-0 text-slate-500 transition-transform ${
                  isExpirationEditorOpen ? "rotate-180" : ""
                }`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isExpirationEditorOpen && (
              <div id={expirationEditorId} className="mt-3">
                <label
                  htmlFor={`expiration-${item.id}`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Utgångsdatum / kontrolldatum
                </label>

                <input
                  id={`expiration-${item.id}`}
                  type="date"
                  value={expirationDate}
                  onChange={handleExpirationDateChange}
                  aria-describedby={
                    expirationError
                      ? `expiration-error-${item.id}`
                      : expirationMessage
                        ? `expiration-message-${item.id}`
                        : undefined
                  }
                  aria-invalid={Boolean(expirationError)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                />

                {isExpired && (
                  <p className="mt-2 text-sm font-medium text-red-800">
                    Det är dags att kontrollera saken igen.
                  </p>
                )}

                {expirationError && (
                  <p
                    id={`expiration-error-${item.id}`}
                    className="mt-2 text-sm font-medium text-red-800"
                    role="alert"
                  >
                    {expirationError}
                  </p>
                )}

                {expirationMessage && (
                  <p
                    id={`expiration-message-${item.id}`}
                    className="mt-2 text-sm font-medium text-green-800"
                    role="status"
                  >
                    {expirationMessage}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExpirationSave}
                    disabled={isSavingExpiration || !hasExpirationChanges}
                    className="min-h-11 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingExpiration ? "Sparar..." : "Spara datum"}
                  </button>

                  {expirationDate && (
                    <button
                      type="button"
                      onClick={() => handleExpirationDateChange({
                        target: { value: "" },
                      } as ChangeEvent<HTMLInputElement>)}
                      disabled={isSavingExpiration}
                      className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Rensa datum
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </article>
  )
}

export default CrisisKitItem