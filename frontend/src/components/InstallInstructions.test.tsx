// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useInstallState } from "../hooks/useInstallState"
import {
  dismissInstallInstructions,
  INSTALL_INSTRUCTIONS_HIDDEN_DAYS,
} from "../services/installInstructionsDismissal"
import type { InstallState } from "../types/pwa"
import InstallInstructions from "./InstallInstructions"

vi.mock("../hooks/useInstallState", () => ({ useInstallState: vi.fn() }))

const iosText =
  "Lägg till KrisKompassen på hemskärmen: tryck på Dela och välj ”Lägg till på hemskärmen”."
const macosText =
  "Lägg till KrisKompassen i Dock: välj Arkiv och sedan ”Lägg till i Dock”, eller klicka på " +
  "Dela och välj ”Lägg till i Dock”."
const closeName = "Stäng installationsinstruktionen"

let stored: Map<string, string>

function mountInstructions(state: InstallState) {
  vi.mocked(useInstallState).mockReturnValue(state)
  return render(
    <>
      <InstallInstructions />
      <h1 id="page-heading" tabIndex={-1}>
        Hem
      </h1>
    </>
  )
}

function visibleText() {
  return screen.getByRole("region", { name: "Installera appen" }).querySelector("p")?.textContent
}

beforeEach(() => {
  stored = new Map()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("InstallInstructions", () => {
  it("shows the iOS text", () => {
    mountInstructions("ios-instructions")

    expect(visibleText()?.replace(/\s+/g, " ")).toBe(iosText)
  })

  it("shows the macOS text", () => {
    mountInstructions("macos-instructions")

    expect(visibleText()?.replace(/\s+/g, " ")).toBe(macosText)
  })

  it.each<InstallState>(["button", "none"])("renders nothing for the state %s", (state) => {
    mountInstructions(state)

    expect(screen.queryByRole("region")).toBe(null)
    expect(screen.queryByRole("button")).toBe(null)
  })

  it("names the region and the close button, keeping the visible word in the name", () => {
    mountInstructions("ios-instructions")

    const button = screen.getByRole("button", { name: closeName })
    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
    expect(button.tagName).toBe("BUTTON")
    expect(button.getAttribute("type")).toBe("button")
    expect(button.textContent).toBe("Stäng")
  })

  it("hides the share icon from assistive technology because the text names it", () => {
    mountInstructions("macos-instructions")

    const icon = screen.getByRole("region", { name: "Installera appen" }).querySelector("svg")
    expect(icon?.getAttribute("aria-hidden")).toBe("true")
    expect(icon?.getAttribute("focusable")).toBe("false")
  })

  it("does not take focus when it appears", () => {
    mountInstructions("ios-instructions")

    expect(document.activeElement).toBe(document.body)
  })

  it("closes, stores the dismissal and moves focus to the page heading", () => {
    mountInstructions("ios-instructions")
    const button = screen.getByRole("button", { name: closeName })
    button.focus()

    fireEvent.click(button)

    expect(screen.queryByRole("region")).toBe(null)
    expect(stored.size).toBe(1)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
  })

  it("stays hidden on the next visit after closing", () => {
    const { unmount } = mountInstructions("ios-instructions")
    fireEvent.click(screen.getByRole("button", { name: closeName }))
    unmount()

    mountInstructions("ios-instructions")

    expect(screen.queryByRole("region")).toBe(null)
  })

  it("shows again when the dismissal has expired", () => {
    const hiddenPeriod = INSTALL_INSTRUCTIONS_HIDDEN_DAYS * 24 * 60 * 60 * 1000
    dismissInstallInstructions(Date.now() - hiddenPeriod)

    mountInstructions("ios-instructions")

    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
  })

  it("still closes for this session when storage fails, and may show again later", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("Storage is blocked", "SecurityError")
      },
      setItem: () => {
        throw new DOMException("Storage is blocked", "SecurityError")
      },
    })
    const { unmount } = mountInstructions("ios-instructions")

    fireEvent.click(screen.getByRole("button", { name: closeName }))
    expect(screen.queryByRole("region")).toBe(null)
    unmount()

    mountInstructions("ios-instructions")
    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
  })
})
