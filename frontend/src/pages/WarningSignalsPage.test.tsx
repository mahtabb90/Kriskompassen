// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { krisinfoSections } from "../content/krisinfo/index"
import { ModeProvider } from "../context/ModeProvider"
import { getKrisinfoSection, KrisinfoError } from "../services/krisinfoService"
import WarningSignalsPage from "./WarningSignalsPage"

vi.mock("../services/krisinfoService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/krisinfoService")>()
  return { ...actual, getKrisinfoSection: vi.fn(actual.getKrisinfoSection) }
})

const readSection = vi.mocked(getKrisinfoSection)
const section = krisinfoSections["warning-signals"]

// Facts pinned here: the signals and their order, which have a meaning and a meaning source,
// which have actions, the action links and the number of drawn tones. Names, labels and texts
// come from the content, so rewording them needs no change in this file.
const SIGNAL_IDS = ["important-message", "air-raid", "readiness-alert", "all-clear"]
const STROKE_COUNTS = [6, 15, 7, 1]
const END_LABELS = ["2 min", "1 min", "5 min", "30 s"]
const MCF_URL = section.source.url
const KRISINFORMATION_VMA_URL =
  "https://www.krisinformation.se/varningssystem/vma-flyglarm-och-beredskapslarm/viktigt-meddelande-till-allmanheten-sa-funkar-det/"
const P4_URL = "https://www.sverigesradio.se/kanaler"
const KRISINFORMATION_URL = "https://www.krisinformation.se/"

function signal(id: string) {
  const found = section.items.find((item) => item.id === id)
  if (!found) throw new Error(`Missing signal ${id}`)
  return found
}

function renderPage() {
  return render(
    <ModeProvider>
      <WarningSignalsPage />
    </ModeProvider>
  )
}

async function renderReady() {
  const view = renderPage()
  await screen.findByText(section.summary)
  return view
}

function signalCards() {
  return screen
    .getAllByRole("heading", { level: 2 })
    .filter((heading) => heading.id !== "signal-sources-heading")
    .map((heading) => heading.closest("li")!)
}

function goOffline() {
  act(() => {
    window.dispatchEvent(new Event("offline"))
  })
}

afterEach(() => {
  cleanup()
  readSection.mockClear()
  vi.unstubAllGlobals()
})

describe("WarningSignalsPage", () => {
  it("keeps one focusable page heading while loading and when ready", async () => {
    renderPage()
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.id).toBe("page-heading")
    expect(heading.getAttribute("tabindex")).toBe("-1")
    expect(screen.getByRole("status").textContent).toBe("Läser in varningssignalerna…")

    await screen.findByText(section.summary)
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("shows the four signals as h2 headings in the source's order", async () => {
    await renderReady()
    expect(
      signalCards().map((card) => within(card).getByRole("heading", { level: 2 }).textContent)
    ).toEqual(SIGNAL_IDS.map((id) => signal(id).name))
  })

  it("nests every other heading as h3 under a signal", async () => {
    await renderReady()
    for (const heading of screen.queryAllByRole("heading", { level: 3 })) {
      expect(heading.closest("li")).toBeTruthy()
    }
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0)
  })

  it("draws each signal's tones as a decorative pattern beside its description", async () => {
    await renderReady()
    signalCards().forEach((card, index) => {
      const item = signal(SIGNAL_IDS[index])
      expect(within(card).getByText(item.patternDescription)).toBeTruthy()
      const strokes = card.querySelectorAll("svg g rect")
      expect(strokes).toHaveLength(STROKE_COUNTS[index])
      expect(strokes[0].closest("[aria-hidden='true']")).toBeTruthy()
    })
  })

  it("labels each timeline from 0 s to the duration the content states", async () => {
    await renderReady()
    const timelineLabels = signalCards().map((card) => {
      const timeline = card.querySelector("svg g")!.closest("svg")!.parentElement!
      expect(timeline.getAttribute("aria-hidden")).toBe("true")
      return [...timeline.querySelectorAll("span")].map((span) => span.textContent)
    })
    expect(timelineLabels).toEqual(END_LABELS.map((end) => ["0 s", end]))
  })

  it("shows a meaning only where the content has one, with Krisinformation.se as its source", async () => {
    await renderReady()
    const shown = signalCards().map((card) => [
      within(card).queryByRole("heading", { level: 3, name: "Betydelse" }) !== null,
      within(card)
        .queryAllByRole("link")
        .find((link) => link.getAttribute("href") === KRISINFORMATION_VMA_URL) !== undefined,
    ])
    expect(shown).toEqual([
      [true, true],
      [false, false],
      [true, false],
      [false, false],
    ])
    for (const id of ["important-message", "readiness-alert"]) {
      expect(screen.getByText(signal(id).meaning!)).toBeTruthy()
    }
  })

  it("lists every action's text and leaves out the actions for Faran över", async () => {
    await renderReady()
    const counts = signalCards().map((card) => {
      const heading = within(card).queryByRole("heading", { level: 3, name: "Gör så här" })
      return heading ? within(card).getAllByRole("listitem").length : 0
    })
    expect(counts).toEqual([5, 2, 4, 0])
    signalCards().forEach((card, index) => {
      const steps = within(card).queryAllByRole("listitem")
      expect(steps.map((step) => step.querySelector("p")!.textContent)).toEqual(
        signal(SIGNAL_IDS[index]).whatToDo.map((step) => step.text)
      )
    })
  })

  it("links the P4 and Krisinformation.se steps to new tabs", async () => {
    await renderReady()
    const actionLinks = signalCards().flatMap((card, index) =>
      within(card)
        .queryAllByRole("listitem")
        .flatMap((step) =>
          within(step)
            .queryAllByRole("link")
            .map((link) => [SIGNAL_IDS[index], link.getAttribute("href"), link])
        )
    )
    expect(actionLinks.map(([id, href]) => [id, href])).toEqual([
      ["important-message", P4_URL],
      ["important-message", KRISINFORMATION_URL],
      ["readiness-alert", P4_URL],
    ])
    for (const [, , link] of actionLinks) {
      const anchor = link as HTMLAnchorElement
      expect(anchor.getAttribute("target")).toBe("_blank")
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer")
      expect(anchor.hasAttribute("aria-label")).toBe(false)
      expect(anchor.textContent!.endsWith("(öppnas i ny flik)")).toBe(true)
    }
  })

  it("shows no internet note while the browser reports a connection", async () => {
    await renderReady()
    expect(screen.queryByText("Kräver internetanslutning.")).toBeNull()
  })

  it("says that each content link needs internet once the connection is lost", async () => {
    await renderReady()
    goOffline()
    const contentLinks = signalCards().flatMap((card) => within(card).queryAllByRole("link"))
    expect(contentLinks).toHaveLength(4)
    for (const link of contentLinks) {
      const note = document.getElementById(link.getAttribute("aria-describedby")!)
      expect(note?.textContent).toBe("Kräver internetanslutning.")
    }
    const sources = within(screen.getByRole("region", { name: "Källor" }))
    for (const link of sources.getAllByRole("link")) {
      const note = document.getElementById(link.getAttribute("aria-describedby")!)
      expect(note?.textContent).toBe("Kräver internetanslutning.")
    }
    expect(screen.getAllByText("Kräver internetanslutning.")).toHaveLength(6)
    const [importantMessage] = signalCards()
    for (const step of signal("important-message").whatToDo) {
      expect(within(importantMessage).getByText(step.text)).toBeTruthy()
    }
  })

  it("lists MCF and Krisinformation.se as sources, with their verification dates", async () => {
    await renderReady()
    const sources = within(screen.getByRole("region", { name: "Källor" }))
    const links = sources.getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      [`${section.source.name} (öppnas i ny flik)`, MCF_URL],
      ["Krisinformation.se (öppnas i ny flik)", KRISINFORMATION_VMA_URL],
    ])
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    }
    expect(sources.getAllByText("Senast kontrollerad: 2 november 2026")).toHaveLength(2)
  })

  it("makes no network request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await renderReady()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows a Swedish error with a retry that loads the signals", async () => {
    readSection.mockRejectedValueOnce(new KrisinfoError("unknown_section", "Unknown section"))
    renderPage()
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Varningssignalerna kunde inte visas. Försök igen."
    )
    await act(async () => screen.getByRole("button", { name: "Försök igen" }).click())
    await screen.findByText(section.summary)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(readSection).toHaveBeenCalledTimes(2)
  })
})
