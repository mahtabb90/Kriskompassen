// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { krisinfoSections } from "../content/krisinfo/index"
import { ModeProvider } from "../context/ModeProvider"
import { getKrisinfoSection, KrisinfoError } from "../services/krisinfoService"
import PhoneNumbersPage from "./PhoneNumbersPage"

vi.mock("../services/krisinfoService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/krisinfoService")>()
  return { ...actual, getKrisinfoSection: vi.fn(actual.getKrisinfoSection) }
})

const readSection = vi.mocked(getKrisinfoSection)
const section = krisinfoSections["phone-numbers"]

// Facts pinned here: the numbers, their order and their tel: links. Labels and texts come from
// the content, so rewording them needs no change in this file.
const NUMBERS_AND_HREFS = [
  ["112", "tel:112"],
  ["1177", "tel:1177"],
  ["113 13", "tel:11313"],
  ["114 14", "tel:11414"],
  ["116 111", "tel:116111"],
  ["020-22 11 44", "tel:020221144"],
]

function phone(number: string) {
  const found = section.items.find((item) => item.number === number)
  if (!found) throw new Error(`Missing phone number ${number}`)
  return found
}

// The page reads browser connectivity through useMode, so it renders inside the real provider.
function renderPage() {
  return render(
    <ModeProvider>
      <MemoryRouter>
        <PhoneNumbersPage />
      </MemoryRouter>
    </ModeProvider>
  )
}

async function renderReady() {
  const view = renderPage()
  await screen.findByText(section.summary)
  return view
}

function telLinks(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll<HTMLAnchorElement>(selector)].map((link) => [
    link.textContent,
    link.getAttribute("href"),
  ])
}

afterEach(() => {
  cleanup()
  readSection.mockClear()
  vi.unstubAllGlobals()
})

describe("PhoneNumbersPage", () => {
  it("keeps one focusable page heading while loading and when ready", async () => {
    renderPage()
    const heading = screen.getByRole("heading", { level: 1, name: "Viktiga telefonnummer" })
    expect(heading.id).toBe("page-heading")
    expect(heading.getAttribute("tabindex")).toBe("-1")
    expect(screen.getByRole("status").textContent).toBe("Läser in telefonnummer…")

    await screen.findByText(section.summary)
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("links back to the krisinfo overview before the page heading", () => {
    renderPage()
    const back = screen.getByRole("link", { name: "Tillbaka till krisinformation" })
    expect(back.getAttribute("href")).toBe("/krisinformation")
    const heading = screen.getByRole("heading", { level: 1 })
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("names each number's heading with both the number and its label, in order", async () => {
    await renderReady()
    for (const [number] of NUMBERS_AND_HREFS) {
      const { label } = phone(number)
      expect(screen.getByRole("heading", { level: 2, name: `${number} ${label}` })).toBeTruthy()
    }
    const numberHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .filter((heading) => heading.id !== "phone-sources-heading")
    expect(numberHeadings.map((heading) => heading.querySelector("span")?.textContent)).toEqual(
      NUMBERS_AND_HREFS.map(([number]) => number)
    )
  })

  it("shows each number's guidance from the content", async () => {
    await renderReady()
    for (const item of section.items) {
      expect(screen.getByText(item.whenToUse)).toBeTruthy()
      expect(screen.getByText(item.description)).toBeTruthy()
    }
  })

  it("links every number in order to a tel: href without spaces, hyphens or +46", async () => {
    const { container } = await renderReady()
    expect(telLinks(container, 'a[href^="tel:"]:not([href^="tel:+"])')).toEqual(
      NUMBERS_AND_HREFS.map(([number, href]) => [`Ring ${number}`, href])
    )
  })

  it("gives each call link a descriptive name that starts with its visible text", async () => {
    await renderReady()
    const emergency = screen.getByRole("link", { name: "Ring 112, akut nödnummer" })
    expect(emergency.getAttribute("href")).toBe("tel:112")
    for (const [number, href] of NUMBERS_AND_HREFS.slice(1)) {
      const link = screen.getByRole("link", { name: `Ring ${number}, ${phone(number).label}` })
      expect(link.getAttribute("href")).toBe(href)
    }
  })

  it("marks 112, and only 112, as the emergency number", async () => {
    await renderReady()
    const marker = screen.getByText("Akut nödnummer")
    const item = marker.closest("li")!
    expect(within(item).getByRole("heading", { level: 2 }).textContent).toContain("112")
    expect(within(item).getByRole("link", { name: "Ring 112, akut nödnummer" })).toBeTruthy()
    expect(item.parentElement!.firstElementChild).toBe(item)
    expect(screen.getAllByText("Akut nödnummer")).toHaveLength(1)
  })

  it("links the numbers for calls from abroad with +46 for 1177, 113 13 and 114 14 only", async () => {
    const { container } = await renderReady()
    expect(telLinks(container, 'a[href^="tel:+"]')).toEqual([
      ["Ring från utlandet", "tel:+46771117700"],
      ["Ring från utlandet", "tel:+46773311313"],
      ["Ring från utlandet", "tel:+46771141400"],
    ])
    for (const number of ["1177", "113 13", "114 14"]) {
      const { abroadNumber } = phone(number)
      const link = screen.getByRole("link", {
        name: `Ring från utlandet eller med utländsk telefon till ${number}, ${abroadNumber}`,
      })
      expect(link.getAttribute("href")?.startsWith("tel:+46")).toBe(true)
    }
  })

  it("shows every number as plain text outside its links so it can be copied", async () => {
    await renderReady()
    for (const item of section.items) {
      const shown = screen.getByText(item.number, { selector: "h2 span" })
      expect(shown.closest("a")).toBeNull()
      if (item.abroadNumber) expect(screen.getByText(item.abroadNumber).closest("a")).toBeNull()
    }
  })

  it("lists each source once, opening in a new tab, with its verification date", async () => {
    await renderReady()
    const sources = within(screen.getByRole("region", { name: "Källor" }))
    const links = sources.getAllByRole("link")
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["SOS Alarm (öppnas i ny flik)", phone("112").source.url],
      ["1177.se (öppnas i ny flik)", phone("1177").source.url],
      ["Krisinformation.se (öppnas i ny flik)", section.source.url],
      ["Bris (öppnas i ny flik)", phone("116 111").source.url],
      ["Teletal (öppnas i ny flik)", phone("020-22 11 44").source.url],
    ])
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    }
    expect(sources.getAllByText("Senast kontrollerad: 2 november 2026")).toHaveLength(5)
  })

  it("says that each source link needs internet once the connection is lost", async () => {
    await renderReady()
    const sources = within(screen.getByRole("region", { name: "Källor" }))
    expect(sources.queryByText("Kräver internetanslutning.")).toBeNull()
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    const links = sources.getAllByRole("link")
    for (const link of links) {
      const note = document.getElementById(link.getAttribute("aria-describedby")!)
      expect(note?.textContent).toBe("Kräver internetanslutning.")
    }
    expect(sources.getAllByText("Kräver internetanslutning.")).toHaveLength(links.length)
    expect(screen.getAllByRole("link", { name: /^Ring / }).length).toBeGreaterThan(0)
    for (const link of screen.getAllByRole("link", { name: /^Ring / })) {
      expect(link.hasAttribute("aria-describedby")).toBe(false)
    }
  })

  it("makes no network request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await renderReady()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows a Swedish error with a retry that loads the numbers", async () => {
    readSection.mockRejectedValueOnce(new KrisinfoError("unknown_section", "Unknown section"))
    renderPage()
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Telefonnumren kunde inte visas. Försök igen."
    )
    await act(async () => screen.getByRole("button", { name: "Försök igen" }).click())
    await screen.findByText(section.summary)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(readSection).toHaveBeenCalledTimes(2)
  })
})
