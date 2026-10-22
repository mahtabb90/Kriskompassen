import { useId } from "react"
import { useMode } from "../context/modeContext"

/**
 * Lets the user turn the "Sparad information" switch on (offline mode) or off (online mode).
 *
 * The label and the visual track sit inside one native button, so clicking either toggles the
 * mode and Space/Enter work without extra key handling. A help text below the switch, referenced
 * by `aria-describedby`, explains what the current mode shows. While there is no network
 * connection the switch cannot be turned off: it stays focusable with `aria-disabled` and the
 * help text explains the restriction, instead of using `disabled`, which would remove it from
 * the Tab order.
 */
function ModeToggle() {
  const { mode, isOnline, setMode } = useMode()
  const helpTextId = useId()
  const saved = mode === "offline"
  const blocked = saved && !isOnline

  const helpText = blocked
    ? "Visar endast information som är sparad på enheten. Du kan stänga av det när internetanslutningen är tillbaka."
    : saved
      ? "Visar endast information som är sparad på enheten."
      : "Visar aktuell information från internet."

  function handleClick() {
    if (blocked) return
    setMode(saved ? "online" : "offline")
  }

  return (
    // The header constrains the width independently of the help text, keeping all states aligned.
    <div className="flex w-full max-w-xs flex-col items-start gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={saved}
        aria-disabled={blocked || undefined}
        aria-describedby={helpTextId}
        onClick={handleClick}
        className={
          "inline-flex min-h-12 w-full min-w-12 flex-wrap items-center justify-between gap-x-3 gap-y-1 " +
          "rounded-xl px-2 py-2 text-left " +
          (blocked ? "cursor-not-allowed" : "hover:bg-blue-50")
        }
      >
        <span className="text-base font-semibold wrap-anywhere text-blue-900">
          Sparad information
        </span>
        {/* The transparent thumb border becomes visible in forced-colors mode, where the
            white fill is replaced by the system background. */}
        <span
          aria-hidden="true"
          className={
            "ml-auto inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 px-0.5 " +
            "transition-colors duration-150 motion-reduce:transition-none " +
            (saved ? "border-blue-900 bg-blue-900 " : "border-slate-600 bg-slate-600 ") +
            (blocked ? "opacity-60" : "")
          }
        >
          <span
            className={
              "h-5 w-5 rounded-full border border-transparent bg-white " +
              "transition-transform duration-150 motion-reduce:transition-none " +
              (saved ? "translate-x-5" : "translate-x-0")
            }
          />
        </span>
      </button>

      {/* Matches the button's horizontal padding so the help text lines up with the label. */}
      <p id={helpTextId} className="px-2 text-sm text-slate-600">
        {helpText}
      </p>
    </div>
  )
}

export default ModeToggle
