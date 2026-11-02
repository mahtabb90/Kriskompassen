type InstallInstructionPlatform = "chrome-desktop" | "ios" | "macos-safari"

const shareIcon = (
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

/**
 * Renders manual installation steps shared by automatic guidance and on-demand help.
 *
 * The caller selects the platform and controls when the text is shown.
 *
 * @param platform The browser or device whose installation steps to explain.
 */
function InstallInstructionsContent({ platform }: { platform: InstallInstructionPlatform }) {
  if (platform === "chrome-desktop") {
    return (
      <>
        Installera KrisKompassen i Chrome: öppna menyn uppe till höger, välj ”Casta, spara och dela”
        och sedan ”Installera sidan som en app …”. Följ instruktionerna i webbläsaren.
      </>
    )
  }

  if (platform === "ios") {
    return (
      <>
        Lägg till KrisKompassen på hemskärmen: tryck på Dela {shareIcon} och välj ”Lägg till på
        hemskärmen”.
      </>
    )
  }

  return (
    <>
      Lägg till KrisKompassen i Dock: välj Arkiv och sedan ”Lägg till i Dock”, eller klicka på Dela{" "}
      {shareIcon} och välj ”Lägg till i Dock”.
    </>
  )
}

export default InstallInstructionsContent
