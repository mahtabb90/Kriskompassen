import type { ReactNode } from "react"

interface ShelterSaveToggleProps {
  saved: boolean
  onToggle: () => void
  /** Extra controls rendered in the same row as the save/remove button, e.g. "Visa detaljer". */
  actions?: ReactNode
}

/**
 * Shows whether a shelter is bookmarked and lets the user save or remove it.
 *
 * Mirrors OfflineToggle's status-line-plus-button pattern used for saved crisis articles, so
 * the two save/bookmark controls in the app look and behave the same way. The button always
 * names the action available ("Spara skyddsrum" / "Ta bort sparat skyddsrum"), not the current
 * state - the status line above it does that instead.
 *
 * The button and `actions` share an equal-width grid row, not a flex row, specifically because
 * "Spara skyddsrum" and "Ta bort sparat skyddsrum" are very different lengths - a flex row lets
 * the shorter state's row stay on one line while the longer one wraps, misaligning the two
 * buttons between cards. A grid row keeps both cells (and therefore both buttons' height) the
 * same regardless of which text wraps.
 */
function ShelterSaveToggle({ saved, onToggle, actions }: ShelterSaveToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span aria-hidden="true">{saved ? "✓" : "○"}</span>
        {saved ? "Sparat skyddsrum" : "Inte sparat"}
      </p>
      <div className={actions ? "grid grid-cols-2 gap-3" : "flex"}>
        <button
          type="button"
          onClick={onToggle}
          className={
            "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl " +
            "border-2 border-blue-900 px-5 py-3 text-center font-semibold " +
            (saved
              ? "bg-white text-blue-900 hover:bg-blue-50"
              : "bg-blue-900 text-white hover:bg-blue-950")
          }
        >
          {saved ? "Ta bort sparat skyddsrum" : "Spara skyddsrum"}
        </button>
        {actions}
      </div>
    </div>
  )
}

export default ShelterSaveToggle
