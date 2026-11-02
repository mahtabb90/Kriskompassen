// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import Footer from "./Footer"

afterEach(cleanup)

describe("Footer", () => {
  it("is the page's only contentinfo landmark and has no headings", () => {
    render(<Footer />)
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
    expect(within(screen.getByRole("contentinfo")).queryByRole("heading")).toBeNull()
  })

  it("shows the exact brand message", () => {
    render(<Footer />)
    expect(
      screen.getByText(
        "Din kompass till tydlig information och bättre beredskap – före och under en kris."
      )
    ).toBeTruthy()
  })

  it("shows the exact copyright line and none of the previous content", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    expect(within(footer).getByText("© 2026 KrisKompassen")).toBeTruthy()
    expect(footer.textContent).not.toContain("KrisKompassen · 2026")
    expect(footer.textContent).not.toContain("Din kompass när krisen kommer")
    expect(footer.textContent).not.toContain("ring 112")
  })

  it("contains no links or other interactive controls", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    expect(footer.querySelector("a, button, input, select, textarea, [tabindex]")).toBeNull()
  })

  it("contains only the message and the copyright line as text", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    expect(footer.textContent).not.toMatch(/@|tel:|\+46|integritet|villkor/i)
    expect([...footer.querySelectorAll("p")]).toHaveLength(2)
  })

  it("hides its only decoration, a small compass icon, from assistive technology", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    const decorative = footer.querySelectorAll("[aria-hidden='true']")
    expect(decorative).toHaveLength(1)
    const icon = decorative[0]
    expect(icon.tagName.toLowerCase()).toBe("svg")
    expect(icon.getAttribute("focusable")).toBe("false")
    expect(icon.querySelector("title")).toBeNull()
    expect(icon.getAttribute("class")).toContain("size-5")
    expect(icon.getAttribute("class")).toContain("text-blue-900")
  })

  it("stays a quiet, slim neutral band with one light-blue top border", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    expect(footer.getAttribute("class")).toContain("bg-slate-50")
    expect(footer.getAttribute("class")).toContain("border-t")
    expect(footer.getAttribute("class")).toContain("border-blue-200")
    expect(footer.getAttribute("class")).not.toContain("bg-blue-900")
    expect(footer.firstElementChild!.getAttribute("class")).toContain("py-3")
  })

  it("lays the message and copyright out in one row from md and stacks them below", () => {
    render(<Footer />)
    const row = screen.getByRole("contentinfo").firstElementChild!
    expect(row.getAttribute("class")).toContain("flex-col")
    expect(row.getAttribute("class")).toContain("md:flex-row")
    expect(row.getAttribute("class")).toContain("md:justify-between")
    expect(row.getAttribute("class")).toContain("md:items-center")
  })

  it("uses a slightly smaller message on mobile and a right-aligned copyright everywhere", () => {
    render(<Footer />)
    const message = screen.getByText(/^Din kompass till tydlig information/)
    expect(message.getAttribute("class")).toContain("text-[13px]")
    expect(message.getAttribute("class")).toContain("md:text-sm")
    const copyright = screen.getByText("© 2026 KrisKompassen")
    expect(copyright.getAttribute("class")).toContain("text-right")
    expect(copyright.getAttribute("class")).not.toContain("text-center")
    expect(copyright.getAttribute("class")).toContain("text-sm")
  })

  it("tightens vertical spacing on mobile and keeps the desktop spacing from md", () => {
    render(<Footer />)
    const row = screen.getByRole("contentinfo").firstElementChild!
    expect(row.getAttribute("class")).toContain("py-1.5")
    expect(row.getAttribute("class")).toContain("md:py-3")
    expect(row.getAttribute("class")).toContain("gap-0")
    expect(row.getAttribute("class")).toContain("md:gap-6")
    const message = screen.getByText(/^Din kompass till tydlig information/)
    expect(message.getAttribute("class")).toContain("leading-snug")
    expect(message.getAttribute("class")).toContain("md:leading-5")
  })

  it("keeps the fixed menu bar's clearance in a separate spacer, not in the footer", () => {
    render(<Footer />)
    const footer = screen.getByRole("contentinfo")
    const spacer = footer.nextElementSibling!
    expect(spacer.getAttribute("aria-hidden")).toBe("true")
    expect(spacer.textContent).toBe("")
    expect(spacer.getAttribute("class")).toContain("var(--navigation-height,0px)")
    expect(footer.innerHTML).not.toContain("--navigation-height")
  })
})
