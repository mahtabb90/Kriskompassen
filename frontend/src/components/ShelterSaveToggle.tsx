import type { ReactNode } from "react"

interface ShelterSaveToggleProps {
  saved: boolean
  onToggle: () => void
  /** Extra controls rendered before the right-hand save/remove button, e.g. "Visa detaljer". */
  actions?: ReactNode
  /** Shows a short warning under the remove button that removing the bookmark also deletes its
   * saved map image - true only when this shelter actually has one, so removal stays an
   * unconfirmed, unchanged one-click action otherwise. */
  hasMapImage?: boolean
}

/**
 * Shows whether a shelter is bookmarked and lets the user save or remove it.
 *
 * Uses a status line above a right-aligned action: blue for saving, red outlined for removal.
 * The button always names the action available ("Spara skyddsrum" / "Ta bort sparat skyddsrum"),
 * not the current state - the status line above it does that instead.
 *
 * Invisible, aria-hidden sizing labels reserve the longer saved-state text in both states,
 * so neither the status nor action row grows when saving. The detail link reserves the same
 * label, giving both controls equal intrinsic minimum widths. They share a row while whole
 * words fit and wrap into separate rows when needed, without splitting words. Extra actions
 * come first in both visual and keyboard order.
 */
function ShelterSaveToggle({ saved, onToggle, actions, hasMapImage }: ShelterSaveToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="grid grid-cols-1 items-center text-sm font-semibold wrap-normal text-slate-700">
        <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
          <span className="mr-2 inline-block w-4 text-center">✓</span>
          Sparat skyddsrum
        </span>
        <span className="col-start-1 row-start-1">
          <span className="mr-2 inline-block w-4 text-center" aria-hidden="true">
            {saved ? "✓" : "○"}
          </span>
          {saved ? "Sparat skyddsrum" : "Inte sparat"}
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
          onClick={onToggle}
          className={
            "inline-grid min-h-12 w-fit min-w-12 shrink-0 items-center justify-items-center rounded-xl wrap-normal " +
            "border-2 px-5 py-3 text-center font-semibold max-sm:px-2 " +
            (saved
              ? "border-red-800 bg-white text-red-800 hover:bg-red-50"
              : "border-blue-900 bg-blue-900 text-white hover:bg-blue-950")
          }
        >
          <span className="invisible col-start-1 row-start-1 select-none" aria-hidden="true">
            Ta bort sparat skyddsrum
          </span>
          <span className="col-start-1 row-start-1">
            {saved ? "Ta bort sparat skyddsrum" : "Spara skyddsrum"}
          </span>
        </button>
      </div>
      {saved && hasMapImage && (
        <p className="text-sm text-slate-600">Den sparade kartbilden tas också bort.</p>
      )}
    </div>
  )
}

export default ShelterSaveToggle
