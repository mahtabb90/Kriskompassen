// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import ExternalLink from "./ExternalLink"

const HREF = "https://example.org/sida"

afterEach(() => {
  cleanup()
})

describe("ExternalLink", () => {
  it("opens the page in a new tab without giving it access to the app", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline />)
    const link = screen.getByRole("link", { name: "Testsida (öppnas i ny flik)" })
    expect(link.getAttribute("href")).toBe(HREF)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("names the link by its visible label first, with no aria-label", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline />)
    const link = screen.getByRole("link")
    expect(link.hasAttribute("aria-label")).toBe(false)
    expect(link.textContent).toBe("Testsida (öppnas i ny flik)")
    expect(screen.getByText("(öppnas i ny flik)").className).toContain("sr-only")
  })

  it("keeps the icon on the same line as the last word of a long label", () => {
    render(<ExternalLink href={HREF} label="Sveriges Radio – lokala P4-kanaler" isOnline />)
    const link = screen.getByRole("link", {
      name: "Sveriges Radio – lokala P4-kanaler (öppnas i ny flik)",
    })
    const icon = link.querySelector("svg")!
    const unbreakable = icon.parentElement!
    expect(unbreakable.className).toContain("whitespace-nowrap")
    expect(unbreakable.textContent).toBe("P4-kanaler")
    expect(link.className).not.toContain("flex")
  })

  it("keeps the icon beside a one-word label", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline />)
    expect(screen.getByRole("link").querySelector("svg")!.parentElement!.textContent).toBe(
      "Testsida"
    )
  })

  it("shows a decorative icon that adds nothing to the accessible name", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline />)
    const icon = screen.getByRole("link").querySelector("svg")!
    expect(icon.getAttribute("aria-hidden")).toBe("true")
    expect(icon.getAttribute("focusable")).toBe("false")
    expect(icon.querySelector("title")).toBeNull()
  })

  it("adds no internet note while online", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline />)
    expect(screen.queryByText("Kräver internetanslutning.")).toBeNull()
    expect(screen.getByRole("link").hasAttribute("aria-describedby")).toBe(false)
  })

  it("keeps the link offline and describes it with the internet note", () => {
    render(<ExternalLink href={HREF} label="Testsida" isOnline={false} />)
    const link = screen.getByRole("link", { name: "Testsida (öppnas i ny flik)" })
    const note = screen.getByText("Kräver internetanslutning.")
    expect(link.getAttribute("href")).toBe(HREF)
    expect(note.closest("a")).toBeNull()
    expect(link.getAttribute("aria-describedby")).toBe(note.id)
  })

  it("gives each link its own note", () => {
    render(
      <>
        <ExternalLink href={HREF} label="Första" isOnline={false} />
        <ExternalLink href={HREF} label="Andra" isOnline={false} />
      </>
    )
    const ids = screen.getAllByRole("link").map((link) => link.getAttribute("aria-describedby"))
    expect(new Set(ids).size).toBe(2)
  })
})
