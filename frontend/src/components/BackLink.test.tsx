// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import BackLink from "./BackLink"

afterEach(() => {
  cleanup()
})

function renderLink() {
  return render(
    <MemoryRouter>
      <BackLink to="/foralder" label="Tillbaka till föräldern" />
    </MemoryRouter>
  )
}

describe("BackLink", () => {
  it("links to the given parent path, named by its label alone", () => {
    renderLink()
    const link = screen.getByRole("link", { name: "Tillbaka till föräldern" })
    expect(link.getAttribute("href")).toBe("/foralder")
    expect(link.hasAttribute("aria-label")).toBe(false)
  })

  it("shows a decorative arrow hidden from assistive technology", () => {
    renderLink()
    const arrow = screen.getByText("←")
    expect(arrow.getAttribute("aria-hidden")).toBe("true")
    expect(arrow.closest("a")).toBe(screen.getByRole("link"))
  })

  it("keeps a target at least 48px tall", () => {
    renderLink()
    expect(screen.getByRole("link").className).toContain("min-h-12")
  })
})
