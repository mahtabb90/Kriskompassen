// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { krisinfoOverviewSections } from "../components/krisinfoOverviewSections"
import KrisinfoOverviewPage from "./KrisinfoOverviewPage"

afterEach(cleanup)

function renderPage() {
  return render(
    <MemoryRouter>
      <KrisinfoOverviewPage />
    </MemoryRouter>
  )
}

const PARTS = [
  { name: "Innan krisen", href: "/crisis" },
  { name: "Telefonnummer", href: "/telefonnummer" },
  { name: "Utomhusvarning", href: "/varningssignaler" },
  { name: "Lugn i kris", href: "/lugn-i-kris" },
]

describe("KrisinfoOverviewPage", () => {
  it("has exactly one focusable page heading", () => {
    renderPage()
    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].id).toBe("page-heading")
    expect(h1s[0].getAttribute("tabindex")).toBe("-1")
    expect(h1s[0].textContent).toBe("Krisinformation")
  })

  it("lists the four parts in order with their routes", () => {
    renderPage()
    const list = screen.getByRole("list", { name: "Delar av krisinformationen" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(4)
    const links = items.map((item) => within(item).getByRole("link"))
    expect(
      links.map((link) => ({ name: link.textContent, href: link.getAttribute("href") }))
    ).toEqual(PARTS.map((part) => ({ name: expect.stringContaining(part.name), href: part.href })))
    PARTS.forEach((part, index) => {
      expect(screen.getByRole("link", { name: part.name })).toBe(links[index])
    })
  })

  it("renders one card per entry in the shared section list", () => {
    renderPage()
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(krisinfoOverviewSections.map((section) => section.to))
  })

  it("names every card by its title, never by a generic link text", () => {
    renderPage()
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("aria-labelledby")).toBeTruthy()
    }
    expect(screen.queryByRole("link", { name: /^(Öppna|Läs mer)$/ })).toBeNull()
  })
})
