// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import KrisinfoSectionCard from "./KrisinfoSectionCard"
import type {
  KrisinfoOverviewSection,
  KrisinfoOverviewSectionIcon,
} from "./krisinfoOverviewSections"

afterEach(cleanup)

const SECTION: KrisinfoOverviewSection = {
  id: "testdel",
  to: "/testdel",
  label: "Testdel",
  description: "En beskrivning av testdelen.",
  icon: "info",
}

function renderCard(section: KrisinfoOverviewSection = SECTION) {
  return render(
    <MemoryRouter>
      <KrisinfoSectionCard section={section} />
    </MemoryRouter>
  )
}

describe("KrisinfoSectionCard", () => {
  it("is one link to the part, named by its title and described by its text", () => {
    renderCard()
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    const link = screen.getByRole("link", { name: "Testdel" })
    expect(link.getAttribute("href")).toBe("/testdel")
    const description = document.getElementById(link.getAttribute("aria-describedby")!)
    expect(description?.textContent).toBe("En beskrivning av testdelen.")
  })

  it("titles the card with a level-two heading inside the link", () => {
    renderCard()
    const heading = screen.getByRole("heading", { level: 2, name: "Testdel" })
    expect(heading.closest("a")).toBe(screen.getByRole("link"))
  })

  it("hides the trailing Öppna cue from assistive technology", () => {
    renderCard()
    const cue = screen.getByText("Öppna")
    expect(cue.getAttribute("aria-hidden")).toBe("true")
  })

  it.each<KrisinfoOverviewSectionIcon>(["info", "phone", "signal", "calm"])(
    "draws a decorative %s icon",
    (icon) => {
      renderCard({ ...SECTION, icon })
      const svgs = screen.getByRole("link").querySelectorAll("svg")
      // The section icon plus the arrow in the hidden cue.
      expect(svgs).toHaveLength(2)
      expect(svgs[0].getAttribute("aria-hidden")).toBe("true")
      expect(svgs[0].getAttribute("focusable")).toBe("false")
      expect(svgs[0].childElementCount).toBeGreaterThan(0)
    }
  )
})
