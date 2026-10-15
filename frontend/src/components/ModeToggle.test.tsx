// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import ModeToggle from "./ModeToggle"

function mountToggle(onLine: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(onLine)
  render(
    <ModeProvider>
      <ModeToggle />
    </ModeProvider>
  )
  return {
    online: screen.getByRole("radio", { name: "Online" }),
    offline: screen.getByRole("radio", { name: "Offline" }),
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ModeToggle keyboard behaviour", () => {
  it("keeps only the selected radio in the Tab order", () => {
    const { online, offline } = mountToggle(true)

    expect(online.getAttribute("aria-checked")).toBe("true")
    expect(online.tabIndex).toBe(0)
    expect(offline.tabIndex).toBe(-1)
  })

  it("moves selection and focus together with the arrow keys", () => {
    const { online, offline } = mountToggle(true)

    fireEvent.keyDown(online, { key: "ArrowRight" })

    expect(offline.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(offline)
    expect(offline.tabIndex).toBe(0)
    expect(online.tabIndex).toBe(-1)

    fireEvent.keyDown(offline, { key: "ArrowLeft" })

    expect(online.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(online)
  })

  it("skips the disabled Online option and explains why while there is no connection", () => {
    const { online, offline } = mountToggle(false)
    offline.focus()

    fireEvent.keyDown(offline, { key: "ArrowRight" })
    fireEvent.keyDown(offline, { key: "ArrowLeft" })

    expect((online as HTMLButtonElement).disabled).toBe(true)
    expect(offline.getAttribute("aria-checked")).toBe("true")
    expect(document.activeElement).toBe(offline)
    expect(screen.getByRole("radiogroup", { name: "Läge" }).getAttribute("aria-describedby")).toBe(
      screen.getByText("Online-läge kräver internetanslutning.").id
    )
  })
})
