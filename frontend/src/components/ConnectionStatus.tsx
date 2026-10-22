import { useRef, type ReactNode } from "react"
import { useMode } from "../context/modeContext"

/**
 * Shows the browser-reported network connectivity, separate from the selected mode.
 *
 * The status line is a polite live region, so connectivity changes are announced even when the
 * mode is not auto-switched and no alert is shown.
 *
 * Also surfaces a dismissible, visible explanation when the app has just force-switched to
 * offline mode because the connection was lost. Dismissing it moves keyboard focus to the status
 * line, which stays mounted, so focus is not dropped when the dismiss button unmounts.
 *
 * @param action An optional adjacent action, outside the live region and above any notice.
 */
function ConnectionStatus({ action }: { action?: ReactNode }) {
  const { isOnline, autoSwitchNotice, dismissAutoSwitchNotice } = useMode()
  const statusRef = useRef<HTMLParagraphElement>(null)

  function handleDismiss() {
    dismissAutoSwitchNotice()
    statusRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className="flex items-baseline gap-2 text-sm text-slate-600"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 self-center rounded-full ${isOnline ? "bg-green-600" : "bg-red-600"}`}
          />
          {isOnline ? "Ansluten" : "Ingen internetanslutning"}
        </p>
        {action}
      </div>

      {autoSwitchNotice && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <span>{autoSwitchNotice}</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-12 min-w-12 font-semibold underline"
          >
            Stäng
          </button>
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus
