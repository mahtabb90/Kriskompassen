import { useMode } from "../context/modeContext"

/**
 * Shows the browser-reported network connectivity, separate from the selected mode.
 *
 * Also surfaces a dismissible, visible explanation when the app has just force-switched to
 * offline mode because the connection was lost.
 */
function ConnectionStatus() {
  const { isOnline, autoSwitchNotice, dismissAutoSwitchNotice } = useMode()

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-600" : "bg-red-600"}`}
        />
        {isOnline ? "Ansluten" : "Ingen internetanslutning"}
      </p>

      {autoSwitchNotice && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <span>{autoSwitchNotice}</span>
          <button
            type="button"
            onClick={dismissAutoSwitchNotice}
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
