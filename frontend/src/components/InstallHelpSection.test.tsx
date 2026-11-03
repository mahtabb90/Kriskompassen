// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import InstallHelpSection from "./InstallHelpSection"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function disclosure() {
  const summary = screen.getByText("Visa installationshjälp")
  return { summary, details: summary.parentElement as HTMLDetailsElement }
}

describe("InstallHelpSection", () => {
  it("provides a named section with a closed native disclosure", () => {
    render(<InstallHelpSection />)
    const { summary, details } = disclosure()

    expect(screen.getByRole("region", { name: "Installera appen" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Installera appen", level: 2 })).toBeTruthy()
    expect(summary.tagName).toBe("SUMMARY")
    expect(details.tagName).toBe("DETAILS")
    expect(details.open).toBe(false)
  })

  it("opens instructions for all three platforms without detecting the browser", () => {
    render(<InstallHelpSection />)
    const { summary, details } = disclosure()

    fireEvent.click(summary)

    expect(details.open).toBe(true)
    expect(screen.getByRole("heading", { name: "Chrome på dator", level: 3 })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "iPhone och iPad", level: 3 })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Safari på Mac", level: 3 })).toBeTruthy()
    expect(details.textContent).toContain("Casta, spara och dela")
    expect(details.textContent).toContain("Installera sidan som en app …")
    expect(details.textContent?.replace(/\s+/g, " ")).toContain("Lägg till på hemskärmen")
    expect(details.textContent).toContain("Lägg till i Dock")
    expect(screen.queryByRole("button", { name: "Installera app" })).toBe(null)
  })

  it("starts closed again on the next page visit", () => {
    const { unmount } = render(<InstallHelpSection />)
    fireEvent.click(disclosure().summary)
    expect(disclosure().details.open).toBe(true)
    unmount()

    render(<InstallHelpSection />)

    expect(disclosure().details.open).toBe(false)
  })

  it("works with blocked storage without reading or changing stored information", () => {
    const blocked = vi.fn(() => {
      throw new DOMException("Storage is blocked", "SecurityError")
    })
    vi.stubGlobal("localStorage", {
      getItem: blocked,
      setItem: blocked,
      removeItem: blocked,
      clear: blocked,
    })
    render(<InstallHelpSection />)

    fireEvent.click(disclosure().summary)
    fireEvent.click(disclosure().summary)

    expect(disclosure().details.open).toBe(false)
    expect(blocked).not.toHaveBeenCalled()
  })
})
