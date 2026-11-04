import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { isSavedOffline, removeOffline, saveOffline } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"

interface OfflineToggleProps {
  item: CrisisItem
  onToggle?: (saved: boolean) => void
  actions?: ReactNode
}

/**
 * Shows whether a crisis item is saved for offline access and lets the user save or remove it.
 *
 * Reads the stored state from IndexedDB on mount. The displayed state only changes after the
 * storage operation succeeds; failures show an error message and keep the previous state.
 * Full success messages remain visible in a persistent live region. Invisible, aria-hidden
 * copies of both messages reserve their larger natural height in a shared grid cell, keeping
 * the controls stable when a message appears at different widths and text sizes. Aligning the
 * message to the cell's bottom keeps unused space above it; an empty error adds no extra gap.
 * Errors stay visible and announced.
 * Confirmation names longer than ten characters use seven characters followed by "...";
 * article headings and the controls' accessible names retain the full title.
 * The saved-state line also reserves its longer label, preventing a row-height change when
 * enlarged text wraps "Sparad offline" more than "Inte sparad".
 * Saving uses the primary button variant; removal uses the destructive outlined variant.
 * Reserves the longer removal label in both states so adjacent actions do not move when saving.
 * Paired controls share a row while whole words fit, then stack without splitting words.
 *
 * @param item The crisis item to save or remove. Its full content is stored when saving.
 * @param onToggle Called with the new saved state after a save or remove succeeds. Not called
 * when the storage operation fails.
 * @param actions Optional controls rendered before the right-hand save/remove button in visual
 * and keyboard order. They stay separate from the button and own their own behaviour.
 */
function OfflineToggle({ item, onToggle, actions }: OfflineToggleProps) {
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const confirmationTitle =
    item.title.length > 10 ? `${item.title.slice(0, 7).trimEnd()}...` : item.title
  const savedConfirmation = `"${confirmationTitle}" har sparats för offlineåtkomst.`
  const removedConfirmation = `"${confirmationTitle}" har tagits bort från offlinelagringen.`

  useEffect(() => {
    let cancelled = false

    isSavedOffline(item.id)
      .then((result) => {
        if (!cancelled) setSaved(result)
      })
      .catch(() => {
        if (!cancelled) {
          setSaved(false)
          setError("Det gick inte att läsa sparad status från lagringen på din enhet.")
        }
      })

    return () => {
      cancelled = true
    }
  }, [item.id])

  async function handleClick() {
    const saving = !saved
    setBusy(true)
    setConfirmation("")
    setError("")

    try {
      if (saving) {
        await saveOffline(item)
      } else {
        await removeOffline(item.id)
      }
      setSaved(saving)
      setConfirmation(saving ? savedConfirmation : removedConfirmation)
      onToggle?.(saving)
    } catch {
      setError(
        saving
          ? "Det gick inte att spara informationen på din enhet. Kontrollera att lagringsutrymme finns och att webbläsaren tillåter lokal lagring, och försök igen."
          : "Det gick inte att ta bort informationen från din enhet. Försök igen."
      )
    } finally {
      setBusy(false)
    }
  }

  const label = saved ? "Ta bort offlinekopia" : "Spara offline"

  return (
    <div className="flex flex-col gap-3">
      <p className="grid grid-cols-1 items-center text-sm font-semibold text-slate-700">
        <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
          <span className="mr-2 inline-block w-4 text-center">✓</span>
          Sparad offline
        </span>
        <span className="col-start-1 row-start-1">
          <span className="mr-2 inline-block w-4 text-center" aria-hidden="true">
            {saved === null ? "…" : saved ? "✓" : "○"}
          </span>
          {saved === null
            ? "Kontrollerar sparad status…"
            : saved
              ? "Sparad offline"
              : "Inte sparad"}
        </span>
      </p>

      <div
        className={
          actions
            ? "flex flex-wrap justify-end gap-3 *:min-w-min *:flex-1 *:px-2"
            : "flex justify-end"
        }
      >
        {actions}
        <button
          type="button"
          onClick={handleClick}
          disabled={busy || saved === null}
          className={
            "inline-grid min-h-12 w-fit min-w-12 shrink-0 items-center justify-items-center rounded-xl wrap-normal " +
            "border-2 px-5 py-3 text-center font-semibold disabled:opacity-60 max-sm:px-2 " +
            (saved
              ? "border-red-800 bg-white text-red-800 hover:bg-red-50"
              : "border-blue-900 bg-blue-900 text-white hover:bg-blue-950")
          }
        >
          <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
            Ta bort offlinekopia
          </span>
          <span className="col-start-1 row-start-1">
            {busy ? "Arbetar…" : label}
            <span className="sr-only">: {item.title}</span>
          </span>
        </button>
      </div>

      <div className="min-w-0">
        <div className="grid min-w-0 grid-cols-1 text-sm font-medium wrap-break-word text-green-800">
          <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
            {savedConfirmation}
          </span>
          <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
            {removedConfirmation}
          </span>
          <div role="status" className="col-start-1 row-start-1 self-end">
            {confirmation}
          </div>
        </div>
        <div role="alert" className={"text-sm font-medium text-red-800" + (error ? " mt-3" : "")}>
          {error}
        </div>
      </div>
    </div>
  )
}

export default OfflineToggle
