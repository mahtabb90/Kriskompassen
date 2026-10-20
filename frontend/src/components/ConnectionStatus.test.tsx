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

describe("ConnectionStatus status semantics", () => {
  it("exposes connectivity as a status region whose text follows the connection", () => {
    render(
      <ModeProvider>
        <ConnectionStatus />
      </ModeProvider>
    )

    const status = screen.getByRole("status")
    expect(status.textContent).toBe("Ansluten")

    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    expect(screen.getByRole("status")).toBe(status)
    expect(status.textContent).toBe("Ingen internetanslutning")

    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    expect(status.textContent).toBe("Ansluten")
  })

  it("keeps the auto-switch explanation as a separate alert", () => {
    render(
      <ModeProvider>
        <ConnectionStatus />
      </ModeProvider>
    )
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })

    expect(screen.getByRole("alert").textContent).toContain("Sparad information har slagits på")
    expect(screen.getByRole("status").contains(screen.getByRole("alert"))).toBe(false)
  })
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
