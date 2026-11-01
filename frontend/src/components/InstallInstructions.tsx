import { useState } from "react"
import { useInstallState } from "../hooks/useInstallState"
import {
  dismissInstallInstructions,
  isInstallInstructionsDismissed,
} from "../services/installInstructionsDismissal"

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="inline-block align-text-bottom text-blue-900"
    >
      <path
        d="M12 15V4m0 0L8 8m4-4 4 4M8 11H6v9h12v-9h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Tells iOS, iPadOS and macOS Safari users how to install the app manually.
 *
 * Renders nothing unless `useInstallState` selects an instruction and the user has not closed it
 * within the hidden period. Closing stores the dismissal and hides the card for this session even
 * if storage fails. The card never takes focus on its own; closing moves focus to the page heading
 * because the focused button disappears.
 */
function InstallInstructions() {
  const installState = useInstallState()
  const [dismissed, setDismissed] = useState(() => isInstallInstructionsDismissed())

  if (dismissed || (installState !== "ios-instructions" && installState !== "macos-instructions")) {
    return null
  }

  function handleClose() {
    dismissInstallInstructions()
    document.getElementById("page-heading")?.focus({ preventScroll: true })
    setDismissed(true)
  }

  return (
    <section
      aria-label="Installera appen"
      className={
        "mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-2xl border " +
        "border-blue-200/80 bg-white p-4 shadow-sm"
      }
    >
      <p className="max-w-prose min-w-0 flex-1 basis-60 leading-relaxed text-slate-700">
        {installState === "ios-instructions" ? (
          <>
            Lägg till KrisKompassen på hemskärmen: tryck på Dela <ShareIcon /> och välj ”Lägg till
            på hemskärmen”.
          </>
        ) : (
          <>
            Lägg till KrisKompassen i Dock: välj Arkiv och sedan ”Lägg till i Dock”, eller klicka på
            Dela <ShareIcon /> och välj ”Lägg till i Dock”.
          </>
        )}
      </p>
      {/* The pseudo-element extends the 32px box to a 48px hit area, as on the install button. */}
      <button
        type="button"
        aria-label="Stäng installationsinstruktionen"
        onClick={handleClose}
        className={
          "relative ml-auto inline-flex min-h-8 min-w-12 cursor-pointer items-center " +
          "justify-center rounded-xl px-2 py-1.5 text-sm font-semibold text-blue-900 underline " +
          "underline-offset-4 hover:bg-blue-50 active:bg-blue-50 after:absolute after:inset-x-0 " +
          "after:-inset-y-2 after:content-['']"
        }
      >
        Stäng
      </button>
    </section>
  )
}

export default InstallInstructions
