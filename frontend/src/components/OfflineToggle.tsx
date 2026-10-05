import { useEffect, useState } from "react"
import { isSavedOffline, removeOffline, saveOffline } from "../services/offlineService"
import type { CrisisItem } from "../types/crisis"

interface OfflineToggleProps {
  item: CrisisItem
}

/**
 * Shows whether a crisis item is saved for offline access and lets the user save or remove it.
 *
 * Reads the stored state from IndexedDB on mount. The displayed state only changes after the
 * storage operation succeeds; failures show an error message and keep the previous state.
 * Success and error messages are announced through live regions.
 *
 * @param item The crisis item to save or remove. Its full content is stored when saving.
 */
function OfflineToggle({ item }: OfflineToggleProps) {
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")

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
      setConfirmation(
        saving
          ? `"${item.title}" har sparats för offlineåtkomst.`
          : `"${item.title}" har tagits bort från offlinelagringen.`
      )
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
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span aria-hidden="true">{saved === null ? "…" : saved ? "✓" : "○"}</span>
        {saved === null ? "Kontrollerar sparad status…" : saved ? "Sparad offline" : "Inte sparad"}
      </p>

      <button
        type="button"
        onClick={handleClick}
        disabled={busy || saved === null}
        className={
          "inline-flex min-h-12 min-w-12 items-center justify-center self-start rounded-xl " +
          "border-2 border-blue-900 px-5 py-3 font-semibold disabled:opacity-60 " +
          (saved
            ? "bg-white text-blue-900 hover:bg-blue-50"
            : "bg-blue-900 text-white hover:bg-blue-950")
        }
      >
        {busy ? "Arbetar…" : label}
        <span className="sr-only">: {item.title}</span>
      </button>

      <div role="status" className="text-sm font-medium text-green-800">
        {confirmation}
      </div>
      <div role="alert" className="text-sm font-medium text-red-800">
        {error}
      </div>
    </div>
  )
}

export default OfflineToggle
