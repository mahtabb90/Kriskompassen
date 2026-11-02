// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { krisinfoSections } from "../content/krisinfo/index"
import { getKrisinfoSection, KrisinfoError } from "../services/krisinfoService"
import PhoneNumbersPage from "./PhoneNumbersPage"

vi.mock("../services/krisinfoService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/krisinfoService")>()
  return { ...actual, getKrisinfoSection: vi.fn(actual.getKrisinfoSection) }
})

const readSection = vi.mocked(getKrisinfoSection)
const section = krisinfoSections["phone-numbers"]

afterEach(() => {
  cleanup()
  readSection.mockClear()
  vi.unstubAllGlobals()
})

describe("PhoneNumbersPage", () => {
  it("keeps one focusable page heading while loading and when ready", async () => {
    render(<PhoneNumbersPage />)
    const heading = screen.getByRole("heading", { level: 1, name: "Viktiga telefonnummer" })
    expect(heading.id).toBe("page-heading")
    expect(heading.getAttribute("tabindex")).toBe("-1")
    expect(screen.getByRole("status").textContent).toBe("Läser in telefonnummer…")

    await screen.findByText(section.summary)
    expect(screen.getByRole("heading", { level: 1 })).toBe(heading)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("lists every number from the content in order with its guidance", async () => {
    render(<PhoneNumbersPage />)
    await screen.findByText(section.summary)
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      section.items.map((phone) => `${phone.number} – ${phone.label}`)
    )
    for (const phone of section.items) {
      expect(screen.getByText(phone.whenToUse)).toBeTruthy()
      expect(screen.getByText(phone.description)).toBeTruthy()
    }
  })

  it("shows the source, opening in a new tab, and the verification date", async () => {
    render(<PhoneNumbersPage />)
    const link = await screen.findByRole("link", {
      name: "Krisinformation.se (öppnas i ny flik)",
    })
    expect(link.getAttribute("href")).toBe(section.source.url)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    expect(screen.getByText("Senast kontrollerad: 2 november 2026")).toBeTruthy()
  })

  it("offers no tel: links and makes no network request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { container } = render(<PhoneNumbersPage />)
    await screen.findByText(section.summary)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows a Swedish error with a retry that loads the numbers", async () => {
    readSection.mockRejectedValueOnce(new KrisinfoError("unknown_section", "Unknown section"))
    render(<PhoneNumbersPage />)
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Telefonnumren kunde inte visas. Försök igen."
    )
    await act(async () => screen.getByRole("button", { name: "Försök igen" }).click())
    await screen.findByText(section.summary)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(readSection).toHaveBeenCalledTimes(2)
  })
})
