// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModeProvider } from "../context/ModeProvider"
import ConnectionStatus from "./ConnectionStatus"

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("ConnectionStatus notice dismissal", () => {
  it("moves focus to the status line, outside the Tab order, when the notice is dismissed", () => {
    render(
      <ModeProvider>
        <ConnectionStatus />
      </ModeProvider>
    )
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })

    const dismiss = screen.getByRole("button", { name: "Stäng" })
    dismiss.focus()
    fireEvent.click(dismiss)

    const status = screen.getByText("Ingen internetanslutning")
    expect(screen.queryByRole("alert")).toBe(null)
    expect(document.activeElement).toBe(status)
    expect(status.getAttribute("tabindex")).toBe("-1")
  })
})
