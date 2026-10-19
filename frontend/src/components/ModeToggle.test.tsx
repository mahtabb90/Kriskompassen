// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import ModeToggle from "./ModeToggle"

const onlineHelp = "Visar aktuell information från internet."
const savedHelp = "Visar information som är sparad på enheten."
const blockedHelp =
  "Visar information som är sparad på enheten. Du kan stänga av det när internetanslutningen är tillbaka."

function mountToggle(onLine: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(onLine)
  render(
    <ModeProvider>
      <ModeToggle />
    </ModeProvider>
  )
  return screen.getByRole("switch", { name: "Sparad information" })
}

function setConnection(onLine: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(onLine)
  act(() => {
    window.dispatchEvent(new Event(onLine ? "online" : "offline"))
  })
}

function description(element: HTMLElement) {
  return document.getElementById(element.getAttribute("aria-describedby") ?? "")?.textContent
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ModeToggle semantics", () => {
  it("is a native button exposed as a switch named by its visible label", () => {
    const toggle = mountToggle(true)

    // Native buttons activate on Space and Enter; jsdom does not simulate that activation, so
    // the element type is asserted here and the key behaviour is verified manually.
    expect(toggle.tagName).toBe("BUTTON")
    expect(toggle.getAttribute("type")).toBe("button")
    expect(toggle.getAttribute("aria-checked")).toBe("false")
    expect(toggle.hasAttribute("aria-disabled")).toBe(false)
    expect(toggle.tabIndex).toBe(0)
  })

  it("describes what the current mode shows", () => {
    const toggle = mountToggle(true)
    expect(description(toggle)).toBe(onlineHelp)

    fireEvent.click(toggle)
    expect(description(toggle)).toBe(savedHelp)
  })
})

describe("ModeToggle switching", () => {
  it("toggles on and off when the switch is clicked", () => {
    const toggle = mountToggle(true)

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("true")

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("false")
  })

  it("toggles when the visible label is clicked", () => {
    const toggle = mountToggle(true)

    fireEvent.click(screen.getByText("Sparad information"))

    expect(toggle.getAttribute("aria-checked")).toBe("true")
  })
})

describe("ModeToggle without a connection", () => {
  it("turns on automatically when the connection is lost", () => {
    const toggle = mountToggle(true)

    setConnection(false)

    expect(toggle.getAttribute("aria-checked")).toBe("true")
  })

  it("stays focusable but cannot be turned off, and explains why", () => {
    const toggle = mountToggle(false)
    toggle.focus()

    fireEvent.click(toggle)

    expect(toggle.getAttribute("aria-checked")).toBe("true")
    expect(toggle.getAttribute("aria-disabled")).toBe("true")
    expect((toggle as HTMLButtonElement).disabled).toBe(false)
    expect(document.activeElement).toBe(toggle)
    expect(description(toggle)).toBe(blockedHelp)
  })

  it("stays on after the connection returns until the user turns it off", () => {
    const toggle = mountToggle(true)
    setConnection(false)

    setConnection(true)

    expect(toggle.getAttribute("aria-checked")).toBe("true")
    expect(toggle.hasAttribute("aria-disabled")).toBe(false)
    expect(description(toggle)).toBe(savedHelp)

    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-checked")).toBe("false")
  })
})
