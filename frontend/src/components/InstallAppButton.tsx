import { useInstallPrompt } from "../hooks/useInstallPrompt"

interface InstallAppButtonProps {
  afterPrompt?: () => void
  variant?: "secondary" | "text"
}

const variantClasses = {
  secondary:
    "inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl " +
    "border-2 border-blue-900 bg-white px-4 py-2 font-semibold text-blue-900 " +
    "hover:bg-blue-50 active:bg-blue-50",
  // The pseudo-element extends the 32px box to a 48px hit area without adding layout height.
  text:
    "relative inline-flex min-h-8 cursor-pointer items-baseline gap-2 rounded-xl px-2 py-1.5 " +
    "text-sm font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-50 " +
    "active:bg-blue-50 after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']",
}

function focusPageHeading() {
  document.getElementById("page-heading")?.focus({ preventScroll: true })
}

/**
 * Offers the browser's install prompt while the browser allows it.
 *
 * Renders nothing otherwise, so no empty space is reserved. The prompt opens synchronously in the
 * click handler, because browsers only allow it during user activation. Opening it uses up the
 * retained event and removes the button, so focus is moved first instead of being dropped to the
 * document body.
 *
 * @param afterPrompt Moves focus once the prompt has opened; defaults to the page heading. A
 *   container with its own focus handling, such as a modal dialog, supplies its own.
 * @param variant The outlined secondary button, or the discreet text button with a decorative
 *   install icon for places where it must not compete with nearby controls.
 */
function InstallAppButton({
  afterPrompt = focusPageHeading,
  variant = "secondary",
}: InstallAppButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  function handleClick() {
    void promptInstall()
    afterPrompt()
  }

  return (
    <button type="button" onClick={handleClick} className={variantClasses[variant]}>
      {variant === "text" ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
          className="shrink-0 self-center"
        >
          <path
            d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      Installera app
    </button>
  )
}

export default InstallAppButton
