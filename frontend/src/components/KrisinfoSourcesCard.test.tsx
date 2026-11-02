// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import KrisinfoSourcesCard from "./KrisinfoSourcesCard"

// Synthetic sources, so these tests cover the card's behaviour for its props. The bundled
// content's sources are pinned by the page tests.
const sources = [
  { source: { name: "Källa A", url: "https://example.org/a" }, lastVerified: "2026-11-02" },
  { source: { name: "Källa B", url: "https://example.org/b" }, lastVerified: "2026-10-15" },
]

function renderCard() {
  return render(
    <KrisinfoSourcesCard sources={sources} headingId="test-sources-heading" intro="Inledning." />
  )
}

afterEach(() => {
  cleanup()
})

describe("KrisinfoSourcesCard", () => {
  it("is a region named by its heading, with the given intro", () => {
    renderCard()
    const region = screen.getByRole("region", { name: "Källor" })
    const heading = within(region).getByRole("heading", { level: 2, name: "Källor" })
    expect(heading.id).toBe("test-sources-heading")
    expect(within(region).getByText("Inledning.")).toBeTruthy()
  })

  it("links each source in order, opening in a new tab", () => {
    renderCard()
    const links = screen.getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Källa A (öppnas i ny flik)", "https://example.org/a"],
      ["Källa B (öppnas i ny flik)", "https://example.org/b"],
    ])
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    }
  })

  it("shows each source's own check date", () => {
    renderCard()
    const items = screen.getAllByRole("listitem")
    expect(within(items[0]).getByText("Senast kontrollerad: 2 november 2026")).toBeTruthy()
    expect(within(items[1]).getByText("Senast kontrollerad: 15 oktober 2026")).toBeTruthy()
  })
})
