import { useRef, type KeyboardEvent } from "react"
import { useMode, type Mode } from "../context/modeContext"

const OPTIONS: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
]

/**
 * Lets the user choose between online and offline mode as a two-option radio group.
 *
 * Supports arrow-key navigation between options, skipping online mode while there is no
 * network connection, and moves keyboard focus together with the selection as the ARIA
 * radio group pattern requires. Online mode is shown as disabled, with an explanation, in
 * that case rather than being removed from the control.
 */
function ModeToggle() {
  const { mode, isOnline, setMode } = useMode()
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  function isDisabled(value: Mode) {
    return value === "online" && !isOnline
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return
    event.preventDefault()

    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1
    const currentIndex = OPTIONS.findIndex((option) => option.value === mode)
    let nextIndex = (currentIndex + direction + OPTIONS.length) % OPTIONS.length

    if (isDisabled(OPTIONS[nextIndex].value)) {
      nextIndex = (nextIndex + direction + OPTIONS.length) % OPTIONS.length
    }

    setMode(OPTIONS[nextIndex].value)
    buttonRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        role="radiogroup"
        aria-label="Läge"
        onKeyDown={handleKeyDown}
        className="inline-flex rounded-xl border border-blue-900 p-1"
      >
        {OPTIONS.map((option, index) => {
          const disabled = isDisabled(option.value)
          const checked = mode === option.value

          return (
            <button
              key={option.value}
              ref={(element) => {
                buttonRefs.current[index] = element
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              tabIndex={checked ? 0 : -1}
              onClick={() => setMode(option.value)}
              className={
                "min-h-12 min-w-12 rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (disabled
                  ? "cursor-not-allowed text-slate-400"
                  : checked
                    ? "bg-blue-900 text-white underline decoration-2 underline-offset-4"
                    : "text-blue-900 hover:bg-blue-50")
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {!isOnline && (
        <p className="text-xs text-slate-600">Online-läge kräver internetanslutning.</p>
      )}
    </div>
  )
}

export default ModeToggle
