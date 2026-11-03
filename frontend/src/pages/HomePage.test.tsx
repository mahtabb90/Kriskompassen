// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { navigationItems } from "../components/navigationItems"
import HomePage from "./HomePage"

afterEach(cleanup)

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
}

const FEATURES = [
  { name: "Krisinformation", href: "/krisinformation" },
  { name: "Min krislåda", href: "/crisis-kit" },
  { name: "Skyddsrum", href: "/skyddsrum" },
  { name: "Inställningar", href: "/installningar" },
]

describe("HomePage", () => {
  it("has exactly one focusable page heading that introduces the product", () => {
    renderPage()
    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].id).toBe("page-heading")
    expect(h1s[0].getAttribute("tabindex")).toBe("-1")
    expect(h1s[0].textContent).toBe("Din kompass i en kris")
    expect(h1s[0].getAttribute("class")).toContain("text-center")
    expect(screen.queryByRole("heading", { name: "Hem" })).toBeNull()
  })

  it("shows the supporting line and value description", () => {
    renderPage()
    const supporting = screen.getByText("Förbered dig. Hitta rätt. Behåll lugnet.")
    expect(supporting.getAttribute("class")).toContain("text-base")
    expect(supporting.getAttribute("class")).toContain("sm:text-lg")
    expect(supporting.getAttribute("class")).not.toContain("text-xl")
    expect(
      screen.getByText(
        "Samla viktig krisinformation, hitta skyddsrum nära dina adresser och spara information för offline-läge – på ett ställe."
      )
    ).toBeTruthy()
  })

  it("lists the value points as plain text with decorative check marks", () => {
    const { container } = renderPage()
    const items = [...container.querySelectorAll("ul li")].filter((li) =>
      li.querySelector("span[aria-hidden='true']")
    )
    expect(items.map((li) => li.textContent?.replace("✓", "").trim())).toEqual([
      "Ingen inloggning",
      "Spara viktig information offline",
      "Tydliga källor",
    ])
    expect(container.querySelector("ul li button, ul li a")).toBeNull()
  })

  it("centres the title group on mobile and left-aligns it from sm", () => {
    renderPage()
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.getAttribute("class")).toContain("text-center")
    expect(heading.getAttribute("class")).toContain("sm:text-left")
    const supporting = screen.getByText("Förbered dig. Hitta rätt. Behåll lugnet.")
    expect(supporting.getAttribute("class")).toContain("sm:text-left")
  })

  it("links the two calls to action to their routes", () => {
    renderPage()
    expect(screen.getByRole("link", { name: "Se krisinformation" }).getAttribute("href")).toBe(
      "/krisinformation"
    )
    expect(screen.getByRole("link", { name: "Öppna min krislåda" }).getAttribute("href")).toBe(
      "/crisis-kit"
    )
  })

  it("keeps a semantic heading order of h1, one h2 and four h3 cards", () => {
    renderPage()
    expect(screen.getAllByRole("heading").map((heading) => heading.tagName)).toEqual([
      "H1",
      "H2",
      "H3",
      "H3",
      "H3",
      "H3",
    ])
    expect(
      screen.getByRole("heading", { level: 2, name: "Det här kan du göra i KrisKompassen" })
    ).toBeTruthy()
  })

  it.each(FEATURES)("links the $name card to $href with a short accessible name", (feature) => {
    renderPage()
    const link = screen.getByRole("link", { name: feature.name })
    expect(link.getAttribute("href")).toBe(feature.href)
    expect(within(link).getByRole("heading", { level: 3, name: feature.name })).toBeTruthy()
    expect(link.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("only links to routes in the shared navigation list", () => {
    renderPage()
    const paths = navigationItems.map((item) => item.to)
    for (const feature of FEATURES) {
      expect(paths).toContain(feature.href)
    }
  })

  it("no longer offers Lugn i kris, which is reached through the krisinfo overview", () => {
    renderPage()
    expect(screen.queryByRole("link", { name: "Lugn i kris" })).toBeNull()
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/lugn-i-kris")
    }
  })

  it("links only to the two calls to action and the four feature cards", () => {
    renderPage()
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/krisinformation",
      "/crisis-kit",
      ...FEATURES.map((feature) => feature.href),
    ])
  })

  it("gives every card half of the row from md, so two cards fill each row", () => {
    renderPage()
    for (const feature of FEATURES) {
      const card = screen.getByRole("link", { name: feature.name }).parentElement!
      expect(card.getAttribute("class")).toContain("md:col-span-3")
    }
  })

  it("hides decorative graphics from assistive technology", () => {
    const { container } = renderPage()
    const svgs = container.querySelectorAll("svg")
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) {
      expect(svg.closest("[aria-hidden='true']")).not.toBeNull()
      expect(svg.getAttribute("focusable")).toBe("false")
    }
  })

  it("ends every card with the same decorative Öppna cue without changing the link name", () => {
    renderPage()
    for (const feature of FEATURES) {
      const link = screen.getByRole("link", { name: feature.name })
      const cue = [...link.querySelectorAll("span[aria-hidden='true']")].find(
        (span) => span.textContent?.trim() === "Öppna"
      )
      expect(cue).toBeTruthy()
      expect(cue!.querySelector("svg")).not.toBeNull()
      expect(cue!.textContent).not.toContain("→")
    }
  })

  it("hides the hero motif below the md breakpoint", () => {
    const { container } = renderPage()
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("hidden")
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("md:block")
  })
})
