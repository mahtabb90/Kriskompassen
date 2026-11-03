// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Phone } from "../types/krisinfo"
import PhoneCard from "./PhoneCard"

// Synthetic posts, so these tests cover the card's behaviour for its props. The bundled
// content's facts are pinned by the content and page tests.
const source = { name: "Testkälla", url: "https://example.org/telefon" }

const emergency: Phone = {
  number: "112",
  label: "Testlarm",
  description: "Beskrivning av larmet.",
  whenToUse: "När det är bråttom.",
  isEmergency: true,
  source,
  lastVerified: "2026-11-02",
}

const regular: Phone = {
  number: "020-12 34 56",
  label: "Testtjänst",
  description: "Beskrivning av tjänsten.",
  whenToUse: "När det inte är bråttom.",
  isEmergency: false,
  abroadNumber: "+46 8-12 34 56",
  source,
  lastVerified: "2026-11-02",
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("PhoneCard", () => {
  it("shows the emergency variant with its label and an emergency link name", () => {
    render(<PhoneCard phone={emergency} />)
    expect(screen.getByText("Akut nödnummer")).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "112 Testlarm" })).toBeTruthy()
    const link = screen.getByRole("link", { name: "Ring 112, akut nödnummer" })
    expect(link.textContent).toBe("Ring 112")
    expect(link.getAttribute("href")).toBe("tel:112")
  })

  it("shows a regular number without the emergency label, named by its service", () => {
    render(<PhoneCard phone={regular} />)
    expect(screen.queryByText("Akut nödnummer")).toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "020-12 34 56 Testtjänst" })).toBeTruthy()
    const link = screen.getByRole("link", { name: "Ring 020-12 34 56, Testtjänst" })
    expect(link.textContent).toBe("Ring 020-12 34 56")
    expect(link.getAttribute("href")).toBe("tel:020123456")
  })

  it("chooses the emergency variant from isEmergency, not from the number", () => {
    render(<PhoneCard phone={{ ...regular, isEmergency: true }} />)
    expect(screen.getByText("Akut nödnummer")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Ring 020-12 34 56, akut nödnummer" })).toBeTruthy()
  })

  it("shows the guidance texts it is given", () => {
    render(<PhoneCard phone={regular} />)
    expect(screen.getByText(regular.whenToUse)).toBeTruthy()
    expect(screen.getByText(regular.description)).toBeTruthy()
  })

  it("links the number for calls from abroad when one is given", () => {
    render(<PhoneCard phone={regular} />)
    const link = screen.getByRole("link", {
      name: "Ring från utlandet eller med utländsk telefon till 020-12 34 56, +46 8-12 34 56",
    })
    expect(link.textContent).toBe("Ring från utlandet")
    expect(link.getAttribute("href")).toBe("tel:+468123456")
  })

  it("leaves out the abroad part when no number for calls from abroad is given", () => {
    render(<PhoneCard phone={emergency} />)
    expect(screen.queryByText(/Från utlandet/)).toBeNull()
    expect(screen.getAllByRole("link")).toHaveLength(1)
  })

  it("shows the numbers as plain text outside the links so they can be copied", () => {
    render(<PhoneCard phone={regular} />)
    expect(screen.getByText(regular.number, { selector: "h2 span" }).closest("a")).toBeNull()
    expect(screen.getByText(regular.abroadNumber!).closest("a")).toBeNull()
  })

  it("renders from its props without any request", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(<PhoneCard phone={emergency} />)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
