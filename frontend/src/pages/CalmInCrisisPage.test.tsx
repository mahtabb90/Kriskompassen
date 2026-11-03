// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import CalmInCrisisPage from "./CalmInCrisisPage"

afterEach(cleanup)

function renderPage() {
  return render(
    <MemoryRouter>
      <CalmInCrisisPage />
    </MemoryRouter>
  )
}

describe("CalmInCrisisPage", () => {
  it("has one focusable page heading and only h2 section headings", () => {
    const { container } = renderPage()
    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].id).toBe("page-heading")
    expect(h1s[0].getAttribute("tabindex")).toBe("-1")
    expect(h1s[0].textContent).toBe("Lugn i kris")
    expect(container.querySelectorAll("h3, h4, h5, h6")).toHaveLength(0)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Vid akut fara",
      "Stanna upp",
      "Andas lugnt",
      "Ta en sak i taget",
      "Sök stöd",
      "Källor",
    ])
  })

  it("shows the tagline, emergency notice and disclaimer as plain text", () => {
    renderPage()
    expect(screen.getByText("Andas. Fokusera. Ta nästa steg.").tagName).toBe("P")
    expect(
      screen.getByText(
        "Vid akut fara – följ aktuella säkerhetsinstruktioner och ring 112 vid behov."
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        "Råden är allmän information och ersätter inte vård eller professionellt stöd."
      )
    ).toBeTruthy()
  })

  it("keeps the source-based advice wording", () => {
    renderPage()
    expect(
      screen.getByText(/Ta tre lugna andetag och rikta hela din uppmärksamhet mot hur det känns/)
    ).toBeTruthy()
    expect(screen.getByText(/Prata med någon som du litar på/)).toBeTruthy()
    expect(screen.getByText(/begränsa din nyhetskonsumtion/)).toBeTruthy()
    expect(
      screen.getByText(/Följ aktuella säkerhetsinstruktioner och börja med det viktigaste./)
    ).toBeTruthy()
    expect(
      screen.getByText(/för aktuella råd eller läsa information som du tidigare har sparat/)
    ).toBeTruthy()
  })

  it("links Innan krisen internally to /crisis in the same tab", () => {
    renderPage()
    const link = screen.getByRole("link", { name: "Innan krisen" })
    expect(link.getAttribute("href")).toBe("/crisis")
    expect(link.getAttribute("target")).toBeNull()
  })

  it("offers only the three official source links, opening in a new tab", () => {
    renderPage()
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") !== "/crisis")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://www.1177.se/liv--halsa/stresshantering-och-somn/mindfulness/",
      "https://www.krisinformation.se/din-beredskap/stod-vid-oro-och-kris/stodlinjer/",
      "https://www.sosalarm.se/112-och-andra-viktiga-nummer/112-appen/fragor-och-svar/ringa-112/nar-ska-jag-ringa-112/",
    ])
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
      expect(link.textContent).toContain("(öppnas i ny flik)")
    }
    expect(screen.getByText("Länkarna kräver internetanslutning.")).toBeTruthy()
  })

  it("adds no buttons or other interaction", () => {
    const { container } = renderPage()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(container.querySelectorAll("input, select, textarea, form")).toHaveLength(0)
  })

  it("hides every decorative graphic from assistive technology and does not animate", () => {
    const { container } = renderPage()
    const svgs = container.querySelectorAll("svg")
    expect(svgs).toHaveLength(5)
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true")
      expect(svg.getAttribute("focusable")).toBe("false")
    }
    expect(container.querySelector("[class*='animate-'], animate, animateTransform")).toBeNull()
  })

  it("uses a small amber dot in the hero motif and in the divider", () => {
    const { container } = renderPage()
    expect(container.querySelectorAll("svg circle.text-amber-400")).toHaveLength(1)
    expect(container.querySelectorAll("span.size-2.bg-amber-400")).toHaveLength(1)
  })

  it("puts the blue/amber accent bar on the hero, advice and sources cards but not the emergency panel", () => {
    const { container } = renderPage()
    const bars = container.querySelectorAll("div.h-1\\.5[aria-hidden='true']")
    expect(bars).toHaveLength(6)
    for (const bar of bars) {
      expect(bar.querySelector("span.bg-blue-900")).toBeTruthy()
      expect(bar.querySelector("span.w-8.bg-amber-400")).toBeTruthy()
    }
    const panel = screen.getByRole("heading", { name: "Vid akut fara" }).parentElement!
    expect(panel.querySelector("div.h-1\\.5")).toBeNull()
  })
})
