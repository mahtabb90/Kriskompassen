// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { Signal } from "../types/krisinfo"
import SignalCard from "./SignalCard"

// Synthetic signals, so these tests cover the card's behaviour for its props. The bundled
// content's facts are pinned by the content and page tests.
const source = { name: "Testkälla", url: "https://example.org/signal" }
const meaningSource = { name: "Betydelsekälla", url: "https://example.org/betydelse" }

const full: Signal = {
  id: "full",
  name: "Testsignal",
  patternDescription: "Beskrivning av mönstret.",
  meaning: "Signalens betydelse.",
  meaningSource,
  whatToDo: [
    { text: "Första steget." },
    { text: "Andra steget.", link: { label: "Testlänk", url: "https://example.org/steg" } },
  ],
  pattern: { toneSeconds: 2, pauseSeconds: 2, repeatCount: 3 },
  source,
  lastVerified: "2026-11-02",
}

const bare: Signal = {
  id: "bare",
  name: "Tyst signal",
  patternDescription: "Ett långt ljud.",
  whatToDo: [],
  pattern: { toneSeconds: 30, pauseSeconds: 0, repeatCount: 1 },
  source,
  lastVerified: "2026-11-02",
}

afterEach(() => {
  cleanup()
})

describe("SignalCard", () => {
  it("names the signal in an h2 with its sections as h3 below it", () => {
    render(<SignalCard signal={full} isOnline />)
    expect(screen.getByRole("heading", { level: 2, name: "Testsignal" })).toBeTruthy()
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
    ).toEqual(["Betydelse", "Gör så här"])
  })

  it("shows the pattern description as text beside the decorative drawing", () => {
    const { container } = render(<SignalCard signal={full} isOnline />)
    expect(screen.getByText("Beskrivning av mönstret.")).toBeTruthy()
    expect(container.querySelectorAll("rect")).toHaveLength(3)
    expect(container.querySelector("rect")!.closest("[aria-hidden='true']")).toBeTruthy()
  })

  it("shows the meaning with a link to its own source", () => {
    render(<SignalCard signal={full} isOnline />)
    expect(screen.getByText("Signalens betydelse.")).toBeTruthy()
    const link = screen.getByRole("link", { name: "Betydelsekälla (öppnas i ny flik)" })
    expect(link.getAttribute("href")).toBe(meaningSource.url)
    expect(link.closest("p")!.textContent).toContain("Källa:")
  })

  it("shows a meaning without a source link when meaningSource is not set", () => {
    render(<SignalCard signal={{ ...full, meaningSource: undefined }} isOnline />)
    expect(screen.getByText("Signalens betydelse.")).toBeTruthy()
    expect(screen.queryByText("Källa:", { exact: false })).toBeNull()
    expect(screen.queryByRole("link", { name: /Betydelsekälla/ })).toBeNull()
  })

  it("lists the actions in order, each step's text with its link as a complement", () => {
    render(<SignalCard signal={full} isOnline />)
    const steps = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(steps.map((step) => step.querySelector("p")!.textContent)).toEqual([
      "Första steget.",
      "Andra steget.",
    ])
    expect(within(steps[0]).queryByRole("link")).toBeNull()
    const link = within(steps[1]).getByRole("link", { name: "Testlänk (öppnas i ny flik)" })
    expect(link.getAttribute("href")).toBe("https://example.org/steg")
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("leaves out the meaning and actions when the content has none", () => {
    render(<SignalCard signal={bare} isOnline />)
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
    expect(screen.queryByRole("list")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("says that each external link needs internet while offline", () => {
    render(<SignalCard signal={full} isOnline={false} />)
    for (const link of screen.getAllByRole("link")) {
      const noteId = link.getAttribute("aria-describedby")!
      expect(document.getElementById(noteId)!.textContent).toBe("Kräver internetanslutning.")
    }
    expect(screen.getAllByText("Kräver internetanslutning.")).toHaveLength(2)
    expect(screen.getByText("Andra steget.")).toBeTruthy()
  })
})
