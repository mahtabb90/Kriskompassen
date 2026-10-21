import { useInstallPrompt } from "../hooks/useInstallPrompt"

interface InstallAppButtonProps {
  afterPrompt?: () => void
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
 */
function InstallAppButton({ afterPrompt = focusPageHeading }: InstallAppButtonProps) {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  function handleClick() {
    void promptInstall()
    afterPrompt()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        "inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl " +
        "border-2 border-blue-900 bg-white px-4 py-2 font-semibold text-blue-900 " +
        "hover:bg-blue-50 active:bg-blue-50"
      }
    >
      Installera app
    </button>
  )
}

export default InstallAppButton
