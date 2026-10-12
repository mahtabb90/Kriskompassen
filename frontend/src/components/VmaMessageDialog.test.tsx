// @vitest-environment jsdom
import { StrictMode } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { feed, now, source } from "../services/__fixtures__/vma"
import { mapVmaMessages } from "../services/vmaMapper"
import { validateVmaResponse } from "../services/vmaResponseValidator"
import { installDialogTestMethods } from "./__fixtures__/dialog"
import VmaMessageDialog from "./VmaMessageDialog"

const message = mapVmaMessages(validateVmaResponse(feed()).records, source, now)[0]
const base = {
  message,
  currentMessage: message,
  loading: false,
  failed: false,
  uncertain: false,
  lastCheckedAt: null,
  onClose: vi.fn(),
}
let restoreDialog: () => void

beforeEach(() => {
  restoreDialog = installDialogTestMethods()
})
afterEach(() => {
  cleanup()
  restoreDialog()
  document.documentElement.style.removeProperty("overflow")
  document.body.style.removeProperty("overflow")
  vi.clearAllMocks()
})

describe("VmaMessageDialog", () => {
  it("wraps Tab and Shift+Tab between boundary controls", () => {
    render(<VmaMessageDialog {...base} />)
    const dialog = screen.getByRole("dialog")
    const first = within(dialog).getByRole("button", { name: "Stäng" })
    const last = within(dialog).getByRole("link", { name: /Mer information hos Sveriges Radio/ })
    last.focus()
    fireEvent.keyDown(last, { key: "Tab" })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
  it("shows every Swedish block, instruction, area, issuer, source and CAP time", () => {
    const detailed = {
      ...message,
      details: [
        { ...message.details[0], instruction: "Stäng ventilationen.\nLyssna på P4." },
        {
          ...message.details[0],
          event: "Andra delen",
          description: "Hela andra texten.",
          area: [],
        },
      ],
    }
    render(<VmaMessageDialog {...base} message={detailed} />)
    const dialog = screen.getByRole("dialog", { name: message.title })
    expect(dialog.getAttribute("aria-describedby")).toBe(null)
    expect(dialog.textContent).toContain("Gå inomhus och stäng dörrar och fönster.")
    expect(dialog.textContent).toContain("Lyssna på lokal P4.")
    expect(dialog.textContent).toContain("Stäng ventilationen.\nLyssna på P4.")
    expect(dialog.textContent).toContain("Hela andra texten.")
    expect(dialog.textContent).toContain("Exempelkommunen")
    expect(dialog.textContent).toContain("Område saknas i meddelandet")
    expect(dialog.textContent).toContain("Avsändare: Sveriges Radio")
    expect(dialog.textContent).toContain("Meddelandet utfärdat: 5 oktober 2026 kl. 13:00")
    expect(dialog.querySelector("time")?.dateTime).toBe(message.sentAt)
    const sourceLink = within(dialog).getByRole("link", { name: /Källa: Sveriges Radio/ })
    expect(sourceLink.getAttribute("href")).toBe(source.url)
    expect(within(dialog).getByRole("heading", { name: "Mer information" })).toBeTruthy()
    expect(
      within(dialog)
        .getByRole("link", { name: /Mer information hos Sveriges Radio/ })
        .getAttribute("href")
    ).toBe(source.url)
  })

  it("labels Update sent time without inventing an original publication date", () => {
    render(<VmaMessageDialog {...base} message={{ ...message, messageType: "Update" }} />)
    expect(screen.getByRole("dialog").textContent).toContain("Meddelandet uppdaterat")
    expect(screen.getByRole("dialog").textContent).not.toContain("Meddelandet utfärdat")
  })

  it("renders upstream markup as text and deduplicates validated message links", () => {
    const markup = '<img src=x onerror="alert(1)"><script>alert(1)</script>'
    const url = "https://www.sverigesradio.se/artikel/syntetiskt-testmeddelande"
    const linked = {
      ...message,
      title: markup,
      details: [{ ...message.details[0], description: markup, instruction: "<b>Gå in</b>" }],
      links: [
        { url, label: markup },
        { url, label: "Samma länk" },
      ],
    }
    render(<VmaMessageDialog {...base} message={linked} />)
    const dialog = screen.getByRole("dialog", { name: markup })
    expect(dialog.textContent).toContain(markup)
    expect(dialog.textContent).toContain("<b>Gå in</b>")
    expect(dialog.querySelector("img, script, b")).toBe(null)
    const links = within(dialog).getAllByRole("link", {
      name: /Mer information hos Sveriges Radio/,
    })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe(url)
    for (const link of within(dialog).getAllByRole("link")) {
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toBe("noopener noreferrer")
      expect(link.textContent).toContain("öppnas i ny flik")
    }
  })

  it.each([
    "https://www.sverigesradio.se/vma",
    "https://sverigesradio.se/vma/",
    "https://www.sverigesradio.se/vma?test=1#information",
  ])("uses the provider homepage instead of the unavailable SR path %s", (url) => {
    render(<VmaMessageDialog {...base} message={{ ...message, links: [{ label: "VMA", url }] }} />)
    const link = screen.getByRole("link", { name: /Mer information hos Sveriges Radio/ })
    expect(link.getAttribute("href")).toBe(source.url)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("preserves a supplied article link when another entry is the unavailable SR path", () => {
    const article = "https://www.sverigesradio.se/artikel/syntetiskt-testmeddelande"
    render(
      <VmaMessageDialog
        {...base}
        message={{
          ...message,
          links: [
            { label: "VMA", url: "https://www.sverigesradio.se/vma" },
            { label: "Artikel", url: article },
          ],
        }}
      />
    )
    const links = screen.getAllByRole("link", { name: /Mer information hos Sveriges Radio/ })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe(article)
  })

  it.each([
    ["expired", "giltighetstid har gått ut"],
    ["superseded", "ersatts av ett nyare meddelande"],
    ["cancelled", "återkallats"],
  ] as const)("retains the selected content when it becomes %s", (inactiveReason, text) => {
    const { rerender } = render(<VmaMessageDialog {...base} />)
    rerender(
      <VmaMessageDialog
        {...base}
        currentMessage={{ ...message, status: "inactive", inactiveReason }}
      />
    )
    expect(screen.getByRole("status").textContent).toContain(text)
    const paragraphs = message.details[0].description.split(/\r?\n\s*\r?\n/)
    for (const paragraph of paragraphs) {
      expect(screen.getByRole("dialog").textContent).toContain(paragraph)
    }
    if (inactiveReason === "expired")
      expect(screen.getByRole("status").textContent).toContain("inte att faran är över")
  })

  it("shows missing/unknown validity and request diagnostics separately from the message date", () => {
    const { rerender } = render(
      <VmaMessageDialog
        {...base}
        currentMessage={undefined}
        failed
        lastCheckedAt={new Date(now).toISOString()}
      />
    )
    expect(screen.getByRole("status").textContent).toContain("aktuella status kan inte verifieras")
    expect(screen.getByRole("status").textContent).toContain("VMA-status kunde inte kontrolleras")
    expect(screen.getByRole("status").querySelector("time")?.dateTime).toBe(
      new Date(now).toISOString()
    )
    rerender(
      <VmaMessageDialog {...base} currentMessage={{ ...message, status: "unknown" }} uncertain />
    )
    expect(screen.getByRole("status").textContent).toContain("giltighet kan inte fastställas")
    expect(screen.getByRole("status").textContent).toContain("informationen kan vara ofullständig")
    rerender(<VmaMessageDialog {...base} loading />)
    expect(screen.getByRole("status").textContent).toContain("Kontrollerar VMA")
  })

  it("focuses the heading, ignores queued close events while reopened, and restores scroll styles", () => {
    document.documentElement.style.overflow = "auto"
    document.body.style.setProperty("overflow", "scroll")
    const onClose = vi.fn()
    const { unmount } = render(
      <StrictMode>
        <VmaMessageDialog {...base} onClose={onClose} />
      </StrictMode>
    )
    const dialog = screen.getByRole<HTMLDialogElement>("dialog")
    expect(dialog.open).toBe(true)
    expect(document.activeElement).toBe(
      within(dialog).getByRole("heading", { name: message.title, level: 2 })
    )
    fireEvent(dialog, new Event("close"))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng" }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.documentElement.style.getPropertyValue("overflow")).toBe("auto")
    expect(document.body.style.overflow).toBe("scroll")
    unmount()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("releases an open dialog and its scroll lock on unmount without a user-close callback", () => {
    const onClose = vi.fn()
    const { unmount } = render(<VmaMessageDialog {...base} onClose={onClose} />)
    const dialog = screen.getByRole<HTMLDialogElement>("dialog")
    expect(document.body.style.overflow).toBe("hidden")
    unmount()
    expect(dialog.open).toBe(false)
    expect(document.body.style.overflow).toBe("")
    expect(document.documentElement.style.overflow).toBe("")
    expect(onClose).not.toHaveBeenCalled()
  })
})
