import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, FormEvent, SyntheticEvent } from "react"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"
import { formatExpirationDate, getExpirationStatus } from "../utils/expirationDate"

interface CrisisKitItemProps {
  item: CrisisKitItemType
  headingLevel?: 3 | 4
  onOwnershipChange: (item: CrisisKitItemType, isOwned: boolean) => Promise<void>
  onNotNeededChange: (item: CrisisKitItemType, isNotNeeded: boolean) => Promise<void>
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
  onNotNeededChange,
  onExpirationDateSave,
  onCustomItemSave,
  onCustomItemDelete,
}: CrisisKitItemProps) {
  const Heading = headingLevel === 4 ? "h4" : "h3"

  const [isSavingOwnership, setIsSavingOwnership] = useState(false)
  const [isOwnershipConfirmationOpen, setIsOwnershipConfirmationOpen] = useState(false)
  const ownershipConfirmationDialogRef = useRef<HTMLDialogElement>(null)

  const [isNotNeededConfirmationOpen, setIsNotNeededConfirmationOpen] = useState(false)
  const notNeededConfirmationDialogRef = useRef<HTMLDialogElement>(null)
  const [isSavingNotNeeded, setIsSavingNotNeeded] = useState(false)
  const [notNeededError, setNotNeededError] = useState<string | null>(null)

  const [customItemDeleteConfirmationOpen, setCustomItemDeleteConfirmationOpen] = useState(false)
  const customItemDeleteDialogRef = useRef<HTMLDialogElement>(null)
  const [isSavingExpiration, setIsSavingExpiration] = useState(false)
  const [ownershipError, setOwnershipError] = useState<string | null>(null)
  const [expirationError, setExpirationError] = useState<string | null>(null)
  const [expirationMessage, setExpirationMessage] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState(item.expirationDate ?? "")
  const [isExpirationEditorOpen, setIsExpirationEditorOpen] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(item.name)
  const [isSavingCustomItem, setIsSavingCustomItem] = useState(false)
  const [customItemError, setCustomItemError] = useState<string | null>(null)
  const [isDeletingCustomItem, setIsDeletingCustomItem] = useState(false)
  const [customItemDeleteError, setCustomItemDeleteError] = useState<string | null>(null)

  const todayString = getTodayString()
  const expirationStatus = getExpirationStatus(item.expirationDate, todayString)
  const hasExpirationChanges = expirationDate !== (item.expirationDate ?? "")
  const expirationEditorId = `expiration-editor-${item.id}`

  useEffect(() => {
    const dialog = ownershipConfirmationDialogRef.current

    if (!dialog) {
      return
    }

    if (isOwnershipConfirmationOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    } else if (!isOwnershipConfirmationOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [isOwnershipConfirmationOpen])

  useEffect(() => {
    const dialog = notNeededConfirmationDialogRef.current

    if (!dialog) {
      return
    }

    if (isNotNeededConfirmationOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    } else if (!isNotNeededConfirmationOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [isNotNeededConfirmationOpen])

  useEffect(() => {
    const dialog = customItemDeleteDialogRef.current

    if (!dialog) {
      return
    }

    if (customItemDeleteConfirmationOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    } else if (!customItemDeleteConfirmationOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close()
      } else {
        dialog.removeAttribute("open")
      }
    }
  }, [customItemDeleteConfirmationOpen])

  async function saveOwnershipChange(isOwned: boolean) {
    setIsSavingOwnership(true)
    setOwnershipError(null)

    try {
      await onOwnershipChange(item, isOwned)

      if (!isOwned && item.expirationDate) {
        setExpirationDate("")
        setIsExpirationEditorOpen(false)
      }

      setIsOwnershipConfirmationOpen(false)
    } catch {
      setOwnershipError("Det gick inte att spara ändringen. Försök igen.")
      setIsOwnershipConfirmationOpen(false)
    } finally {
      setIsSavingOwnership(false)
    }
  }

  function handleOwnershipChange(event: ChangeEvent<HTMLInputElement>) {
    const isOwned = event.target.checked

    if (!isOwned && item.expirationDate) {
      setIsOwnershipConfirmationOpen(true)
      return
    }

    void saveOwnershipChange(isOwned)
  }

  function handleOwnershipConfirmationCancel() {
    setIsOwnershipConfirmationOpen(false)
  }

  function handleOwnershipConfirmationCancelEvent(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    setIsOwnershipConfirmationOpen(false)
  }

  async function handleOwnershipConfirmation() {
    await saveOwnershipChange(false)
  }

  function handleNotNeededChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      setNotNeededError(null)
      setIsNotNeededConfirmationOpen(true)
      return
    }

    void saveNotNeededChange(false)
  }

  async function saveNotNeededChange(isNotNeeded: boolean) {
    setIsSavingNotNeeded(true)
    setNotNeededError(null)

    try {
      await onNotNeededChange(item, isNotNeeded)
      setIsNotNeededConfirmationOpen(false)
    } catch {
      setNotNeededError("Det gick inte att spara ändringen. Försök igen.")
      setIsNotNeededConfirmationOpen(false)
    } finally {
      setIsSavingNotNeeded(false)
    }
  }

  function handleNotNeededConfirmationCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    setIsNotNeededConfirmationOpen(false)
  }

  async function handleExpirationSave(dateToSave = expirationDate) {
    setIsSavingExpiration(true)
    setExpirationError(null)
    setExpirationMessage(null)

    try {
      await onExpirationDateSave(item, dateToSave || null)
      setExpirationDate(dateToSave)
      setExpirationMessage("Ändringen har sparats.")
    } catch {
      setExpirationError("Det gick inte att spara datumet. Kontrollera datumet och försök igen.")
      setExpirationDate(item.expirationDate ?? "")
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
    setCustomItemError(null)
    setIsEditing(true)
  }

  function handleEditCancel() {
    setEditedName(item.name)
    setCustomItemError(null)
    setIsEditing(false)
  }

  async function handleCustomItemSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingCustomItem(true)
    setCustomItemError(null)

    try {
      await onCustomItemSave(item, editedName, item.category)
      setIsEditing(false)
    } catch (error) {
      setCustomItemError(
        error instanceof Error ? error.message : "Det gick inte att spara ändringarna. Försök igen."
      )
    } finally {
      setIsSavingCustomItem(false)
    }
  }

  function handleCustomItemDelete() {
    setCustomItemDeleteError(null)
    setCustomItemDeleteConfirmationOpen(true)
  }

  function handleCustomItemDeleteCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    setCustomItemDeleteConfirmationOpen(false)
  }

  async function handleCustomItemDeleteConfirmation() {
    setIsDeletingCustomItem(true)
    setCustomItemDeleteError(null)

    try {
      await onCustomItemDelete(item)
      setCustomItemDeleteConfirmationOpen(false)
    } catch (error) {
      setCustomItemDeleteError(
        error instanceof Error ? error.message : "Det gick inte att ta bort saken. Försök igen."
      )
      setCustomItemDeleteConfirmationOpen(false)
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
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
            />
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
              className="min-h-11 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900    disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingCustomItem ? "Sparar..." : "Spara ändringar"}
            </button>
            <button
              type="button"
              onClick={handleEditCancel}
              disabled={isSavingCustomItem}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50    disabled:cursor-not-allowed disabled:opacity-50"
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
              {item.isCustom && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                  >
                    <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M4 17c.5-3.2 2.5-5 6-5s5.5 1.8 6 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Tillagd av användaren
                </p>
              )}
            </div>

            <span
              className={`shrink-0 rounded-lg border px-3 py-1 text-sm font-medium ${
                item.isNotNeeded
                  ? "border-slate-300 bg-slate-100 text-slate-600"
                  : item.isOwned
                    ? "border-green-300 bg-green-100 text-green-800"
                    : "border-red-300 bg-red-100 text-red-800"
              }`}
            >
              {item.isNotNeeded ? "Deaktiverad" : item.isOwned ? "Finns" : "Saknas"}
            </span>
          </div>

          {item.isCustom && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEditStart}
                disabled={isDeletingCustomItem}
                className="min-h-11 rounded-lg border-2 border-blue-900 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Redigera
              </button>
              <button
                type="button"
                onClick={handleCustomItemDelete}
                disabled={isDeletingCustomItem}
                className="min-h-11 rounded-lg border-2 border-red-800 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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

          <dialog
            ref={ownershipConfirmationDialogRef}
            aria-labelledby={`ownership-confirmation-title-${item.id}`}
            onCancel={handleOwnershipConfirmationCancelEvent}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-blue-200/80 bg-white p-6 text-left text-slate-700 shadow-sm backdrop:bg-slate-950/50"
          >
            <h2
              id={`ownership-confirmation-title-${item.id}`}
              className="wrap-anywhere text-xl font-bold text-blue-900"
            >
              Vill du markera varan som saknas?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              Varans kontrolldatum kommer att raderas.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleOwnershipConfirmationCancel}
                disabled={isSavingOwnership}
                autoFocus
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-base font-semibold text-blue-900 hover:bg-blue-50 active:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleOwnershipConfirmation}
                disabled={isSavingOwnership}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-base font-semibold text-white hover:bg-blue-950 active:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingOwnership ? "Sparar..." : "Ja, markera som saknas"}
              </button>
            </div>
          </dialog>

          <dialog
            ref={notNeededConfirmationDialogRef}
            aria-labelledby={`not-needed-confirmation-title-${item.id}`}
            onCancel={handleNotNeededConfirmationCancel}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-blue-200/80 bg-white p-6 text-left text-slate-700 shadow-sm backdrop:bg-slate-950/50"
          >
            <h2
              id={`not-needed-confirmation-title-${item.id}`}
              className="wrap-anywhere text-xl font-bold text-blue-900"
            >
              Vill du markera saken som något du inte behöver?
            </h2>

            <p className="mt-3 text-base leading-relaxed text-slate-700">
              Saken markeras som "Behövs inte" och räknas inte med i din beredskapsöversikt eller
              kategorins sammanställning. Den finns kvar i listan och du kan ändra tillbaka när som
              helst.
            </p>

            {notNeededError && (
              <p className="mt-3 text-sm font-medium text-red-800" role="alert">
                {notNeededError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNotNeededConfirmationOpen(false)}
                disabled={isSavingNotNeeded}
                autoFocus
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-base font-semibold text-blue-900 hover:bg-blue-50 active:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void saveNotNeededChange(true)}
                disabled={isSavingNotNeeded}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-base font-semibold text-white hover:bg-blue-950 active:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingNotNeeded ? "Sparar..." : "Ja, markera som Behövs inte"}
              </button>
            </div>
          </dialog>

          <dialog
            ref={customItemDeleteDialogRef}
            aria-labelledby={`custom-item-delete-title-${item.id}`}
            onCancel={handleCustomItemDeleteCancel}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-blue-200/80 bg-white p-6 text-left text-slate-700 shadow-sm backdrop:bg-slate-950/50"
          >
            <h2
              id={`custom-item-delete-title-${item.id}`}
              className="wrap-anywhere text-xl font-bold text-blue-900"
            >
              Vill du ta bort "{item.name}" från din krislåda?
            </h2>

            <p className="mt-3 text-base leading-relaxed text-slate-700">
              Åtgärden kan inte ångras.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCustomItemDeleteConfirmationOpen(false)}
                disabled={isDeletingCustomItem}
                autoFocus
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-base font-semibold text-blue-900 hover:bg-blue-50 active:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Avbryt
              </button>

              <button
                type="button"
                onClick={handleCustomItemDeleteConfirmation}
                disabled={isDeletingCustomItem}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-red-800 px-5 py-3 text-base font-semibold text-white hover:bg-red-900 active:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingCustomItem ? "Tar bort..." : "Ja, ta bort"}
              </button>
            </div>
          </dialog>

          <div className="mt-4">
            <label
              className={`flex min-h-11 items-center gap-3 ${
                item.isNotNeeded ? "cursor-not-allowed text-slate-500" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={item.isOwned}
                disabled={isSavingOwnership || Boolean(item.isNotNeeded)}
                onChange={handleOwnershipChange}
                className="size-5 accent-blue-800   "
              />
              <span
                className={`text-sm font-medium ${
                  item.isNotNeeded ? "text-slate-500" : "text-slate-700"
                }`}
              >
                {isSavingOwnership ? "Sparar..." : "Jag har den här saken"}
              </span>
            </label>

            {ownershipError && (
              <p className="mt-2 text-sm font-medium text-red-800" role="alert">
                {ownershipError}
              </p>
            )}
          </div>

          {!item.isCustom && (
            <div className="mt-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(item.isNotNeeded)}
                  disabled={isSavingNotNeeded}
                  onChange={handleNotNeededChange}
                  className="size-5 accent-blue-800"
                />
                <span className="text-sm font-medium text-slate-700">
                  {isSavingNotNeeded
                    ? "Sparar..."
                    : item.isNotNeeded
                      ? "Markerad: Behövs inte"
                      : "Behövs inte"}
                </span>
              </label>

              {item.isNotNeeded && (
                <p className="ml-8 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span aria-hidden="true" className="font-bold text-red-700">
                    ✕
                  </span>
                  Deaktiverad – räknas inte med i beredskapsöversikten.
                </p>
              )}

              {notNeededError && (
                <p className="mt-2 text-sm font-medium text-red-800" role="alert">
                  {notNeededError}
                </p>
              )}
            </div>
          )}

          {item.isOwned && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsExpirationEditorOpen((isOpen) => !isOpen)}
                aria-expanded={isExpirationEditorOpen}
                aria-controls={expirationEditorId}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50   "
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
                        {formatExpirationDate(item.expirationDate)}
                      </span>
                      {expirationStatus && (
                        <span
                          className={`mt-0.5 block text-sm font-medium ${
                            expirationStatus === "expired"
                              ? "text-red-800"
                              : expirationStatus === "soon"
                                ? "text-orange-800"
                                : "text-green-800"
                          }`}
                        >
                          {expirationStatus === "expired"
                            ? "Utgången"
                            : expirationStatus === "soon"
                              ? "Går snart ut"
                              : "OK"}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm font-medium text-blue-800">
                      Lägg till kontrolldatum
                    </span>
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
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800   "
                  />

                  {expirationStatus === "expired" && !hasExpirationChanges && (
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
                      <span aria-hidden="true" className="mr-2">
                        ✓
                      </span>
                      {expirationMessage}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExpirationSave()}
                      disabled={isSavingExpiration || !hasExpirationChanges}
                      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-base font-semibold text-white hover:bg-blue-950 active:bg-blue-950 disabled:cursor-not-allowed"
                    >
                      {isSavingExpiration ? "Sparar..." : "Spara datum"}
                    </button>

                    {(expirationDate || item.expirationDate) && (
                      <button
                        type="button"
                        onClick={() => handleExpirationSave("")}
                        disabled={isSavingExpiration}
                        className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-base font-semibold text-blue-900 hover:bg-blue-50 active:bg-blue-50 disabled:cursor-not-allowed"
                      >
                        {isSavingExpiration ? "Sparar..." : "Rensa datum"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default CrisisKitItem
