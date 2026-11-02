// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import LowAccuracyNotice from "./LowAccuracyNotice"

afterEach(() => {
  cleanup()
})

describe("LowAccuracyNotice", () => {
  it("renders nothing for an accurate fix", () => {
    const { container } = render(<LowAccuracyNotice accuracyMeters={25} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing exactly at the threshold", () => {
    const { container } = render(<LowAccuracyNotice accuracyMeters={5_000} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows a collapsed toggle for an imprecise fix, expanding to the distance and tips", () => {
    render(<LowAccuracyNotice accuracyMeters={6_200} />)

    const toggle = screen.getByRole("button", { name: /Ungefärlig position/ })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    const panelId = toggle.getAttribute("aria-controls")
    const panel = panelId ? document.getElementById(panelId) : null
    expect(panel?.hasAttribute("hidden")).toBe(true)

    fireEvent.click(toggle)

    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(panel?.hasAttribute("hidden")).toBe(false)
    expect(screen.getByText(/ca ±6\.2 km/)).toBeTruthy()
    expect(screen.getByText(/En mobil ger ofta bättre precision/)).toBeTruthy()

    fireEvent.click(toggle)

    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(panel?.hasAttribute("hidden")).toBe(true)
  })
})
