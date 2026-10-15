// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { checkedAt, feed, info, multipleAlerts, now, source } from "../services/__fixtures__/vma"
import { selectVmaBanner } from "../services/vmaBannerSelection"
import { mapVmaMessages } from "../services/vmaMapper"
import { validateVmaResponse } from "../services/vmaResponseValidator"
import VmaBanner from "./VmaBanner"

const message = mapVmaMessages(validateVmaResponse(feed()).records, source, now)[0]
const { records, ...diagnostics } = validateVmaResponse(feed(multipleAlerts))
const active = selectVmaBanner({
  ...diagnostics,
  messages: mapVmaMessages(records, source, now),
  evaluatedAt: new Date(now).toISOString(),
}).activeMessages
const [update, first, second] = active
const empty = {
  message: null,
  activeMessages: [],
  uncertain: false,
  loading: false,
  retrying: false,
  unavailable: false,
  stale: false,
  offline: false,
  lastCheckedAt: null,
  retry: vi.fn(),
  openMessage: vi.fn(),
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("VmaBanner", () => {
  it("opens the selected CAP message through a labelled dialog trigger", () => {
    const openMessage = vi.fn()
    render(<VmaBanner {...empty} message={message} openMessage={openMessage} />)
    const trigger = screen.getByRole("button", { name: info.event })
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")
    expect(trigger.getAttribute("data-vma-id")).toBe(message.id)
    fireEvent.click(trigger)
    expect(openMessage).toHaveBeenCalledWith(message, trigger)
  })
  it("pairs the warning icon with the VMA label, complete title and source attribution", () => {
    render(<VmaBanner {...empty} message={message} />)
    expect(screen.getByRole("heading", { name: info.event }).textContent).toBe(info.event)
    expect(screen.getByText("VMA · Viktigt meddelande")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Källa: Sveriges Radio" }).getAttribute("href")).toBe(
      source.url
    )
    expect(screen.getByRole("complementary").tabIndex).toBe(0)
    const icon = screen.getByRole("complementary").querySelector("svg")
    expect(icon).not.toBe(null)
    expect(icon?.getAttribute("aria-hidden")).toBe("true")
    expect(icon?.getAttribute("focusable")).toBe("false")
    expect(screen.getByRole("alert").textContent?.trim()).toBe(`VMA: ${info.event}`)
  })

  it.each(["loading", "unavailable", "stale", "uncertain"] as const)(
    "removes the warning icon when only a %s status remains",
    (state) => {
      const { rerender } = render(<VmaBanner {...empty} message={message} />)
      rerender(<VmaBanner {...empty} {...{ [state]: true }} />)
      const notice = screen.getByRole("complementary", { name: "VMA-status" })
      expect(notice.querySelector("svg")).toBe(null)
      expect(screen.getByRole("status").textContent).not.toBe("")
      expect(screen.getByRole("alert").textContent).toBe("")
    }
  )

  it("preserves long and HTML-like titles as text without injecting markup", () => {
    const title = "<img src=x onerror=alert(1)> " + "En lång rubrik i Exempelkommunen. ".repeat(30)
    const { container } = render(<VmaBanner {...empty} message={{ ...message, title }} />)
    expect(screen.getByRole("heading").textContent).toBe(title)
    expect(container.querySelector("img")).toBe(null)
  })

  it("keeps the live region stable for unchanged messages and marks a new CAP ID", () => {
    const { rerender } = render(<VmaBanner {...empty} />)
    const live = screen.getByRole("alert")
    expect(live.textContent).toBe("")
    rerender(<VmaBanner {...empty} message={message} />)
    const announcement = live.firstChild
    rerender(<VmaBanner {...empty} message={{ ...message }} />)
    expect(screen.getByRole("alert")).toBe(live)
    expect(live.firstChild).toBe(announcement)
    rerender(<VmaBanner {...empty} message={{ ...message, id: "new-message" }} />)
    expect(live.firstChild).not.toBe(announcement)
  })

  it("keeps a single active message free of count, disclosure and extra metadata", () => {
    render(<VmaBanner {...empty} message={message} activeMessages={[message]} />)
    const banner = screen.getByRole("complementary")
    expect(banner.textContent).not.toContain("aktiva VMA")
    expect(within(banner).getAllByRole("button")).toHaveLength(1)
    expect(screen.getByRole("button", { name: info.event }).hasAttribute("aria-describedby")).toBe(
      false
    )
  })

  it("shows the count and lists the other messages once each behind a collapsed disclosure", () => {
    render(<VmaBanner {...empty} message={update} activeMessages={active} />)
    const banner = screen.getByRole("complementary")
    expect(within(banner).getByText("3 aktiva VMA")).toBeTruthy()
    expect(screen.getAllByRole("heading")).toHaveLength(1)
    const title = screen.getByRole("button", { name: "Förorenat dricksvatten" })
    const titleMeta = document.getElementById(title.getAttribute("aria-describedby")!)
    expect(titleMeta?.textContent).toContain("Exempellänet · Uppdaterat")
    expect(titleMeta?.querySelector("time")?.dateTime).toBe(update.sentAt)

    const toggle = screen.getByRole("button", { name: "Visa 2 fler VMA" })
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(list.hidden).toBe(true)
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(toggle.textContent).toBe("Dölj fler VMA")
    expect(list.hidden).toBe(false)

    const entries = within(list).getAllByRole("button")
    expect(entries.map((entry) => entry.textContent)).toEqual([
      info.event,
      "Gasläcka i Exempelstad",
    ])
    expect(entries.map((entry) => entry.getAttribute("aria-haspopup"))).toEqual([
      "dialog",
      "dialog",
    ])
    const metas = entries.map(
      (entry) => document.getElementById(entry.getAttribute("aria-describedby")!)?.textContent
    )
    expect(metas[0]).toContain("Exempelkommunen · Utfärdat")
    expect(metas[1]).toContain("Exempelstad · Utfärdat")
    expect(
      [...banner.querySelectorAll<HTMLElement>("[data-vma-id]")].map((node) => node.dataset.vmaId)
    ).toEqual([update.id, first.id, second.id])
  })

  it("opens the CAP message that belongs to each listed headline", () => {
    const openMessage = vi.fn()
    render(
      <VmaBanner {...empty} message={update} activeMessages={active} openMessage={openMessage} />
    )
    fireEvent.click(screen.getByRole("button", { name: "Visa 2 fler VMA" }))
    for (const listed of [first, second]) {
      const trigger = screen.getByRole("button", { name: listed.title })
      fireEvent.click(trigger)
      expect(openMessage).toHaveBeenLastCalledWith(listed, trigger)
    }
    expect(openMessage).toHaveBeenCalledTimes(2)
  })

  it("updates the count and choices as messages change and collapses below two", () => {
    const { rerender } = render(<VmaBanner {...empty} message={update} activeMessages={active} />)
    fireEvent.click(screen.getByRole("button", { name: "Visa 2 fler VMA" }))
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update, second]} />)
    expect(screen.getByText("2 aktiva VMA")).toBeTruthy()
    const toggle = screen.getByRole("button", { name: "Dölj fler VMA" })
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!
    expect(
      within(list)
        .getAllByRole("button")
        .map((entry) => entry.textContent)
    ).toEqual(["Gasläcka i Exempelstad"])
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update]} />)
    expect(screen.queryByText(/aktiva VMA/)).toBe(null)
    expect(screen.queryByRole("button", { name: /fler VMA/ })).toBe(null)
    rerender(<VmaBanner {...empty} message={update} activeMessages={active} />)
    expect(
      screen.getByRole("button", { name: "Visa 2 fler VMA" }).getAttribute("aria-expanded")
    ).toBe("false")
  })

  it("announces a new first message assertively and count changes politely", () => {
    const { container, rerender } = render(<VmaBanner {...empty} />)
    const alert = screen.getByRole("alert")
    const polite = container.querySelector('[aria-live="polite"]')!
    rerender(<VmaBanner {...empty} message={update} activeMessages={active} />)
    expect(alert.textContent).toBe("VMA: Förorenat dricksvatten")
    expect(polite.textContent).toBe("3 aktiva VMA.")
    const announcement = alert.firstChild
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update, second]} />)
    expect(alert.firstChild).toBe(announcement)
    expect(polite.textContent).toBe("2 aktiva VMA.")
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update]} />)
    expect(polite.textContent).toBe("1 aktivt VMA.")
    rerender(<VmaBanner {...empty} />)
    rerender(<VmaBanner {...empty} message={first} activeMessages={[first]} />)
    expect(alert.textContent).toBe(`VMA: ${info.event}`)
    expect(polite.textContent).toBe("")
  })

  it("moves focus to a remaining control when the focused list entry disappears", () => {
    const { rerender } = render(<VmaBanner {...empty} message={update} activeMessages={active} />)
    fireEvent.click(screen.getByRole("button", { name: "Visa 2 fler VMA" }))
    screen.getByRole("button", { name: "Gasläcka i Exempelstad" }).focus()
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update, first]} />)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dölj fler VMA" }))

    screen.getByRole("button", { name: info.event }).focus()
    rerender(<VmaBanner {...empty} message={update} activeMessages={[update]} />)
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Förorenat dricksvatten" })
    )
  })

  it("keeps focus on a listed message that becomes the first message", () => {
    const { rerender } = render(<VmaBanner {...empty} message={update} activeMessages={active} />)
    fireEvent.click(screen.getByRole("button", { name: "Visa 2 fler VMA" }))
    screen.getByRole("button", { name: info.event }).focus()
    rerender(<VmaBanner {...empty} message={first} activeMessages={[first, second]} />)
    const focused = document.activeElement as HTMLElement
    expect(focused.dataset.vmaId).toBe(first.id)
    expect(focused.closest("h2")).not.toBe(null)
  })

  it("leaves no visible banner or all-clear statement for a successful empty result", () => {
    render(<VmaBanner {...empty} />)
    expect(screen.queryByRole("complementary")).toBe(null)
    expect(screen.queryByRole("status")).toBe(null)
    expect(screen.getByRole("alert").textContent).toBe("")
  })

  it("announces loading and uncertainty without suggesting there are no warnings", () => {
    const { rerender } = render(<VmaBanner {...empty} loading />)
    expect(screen.getByRole("status").textContent).toBe("Kontrollerar VMA…")
    expect(screen.getByRole("alert").textContent).toBe("")
    rerender(<VmaBanner {...empty} uncertain />)
    expect(screen.getByRole("status").textContent).toContain(
      "VMA-informationen kan vara ofullständig."
    )
    expect(screen.getByRole("button", { name: "Försök igen" })).toBeTruthy()
  })

  it("states that VMA information is unavailable, never that there are no warnings", () => {
    const retry = vi.fn()
    const { rerender } = render(<VmaBanner {...empty} unavailable retry={retry} />)
    expect(screen.getByRole("complementary", { name: "VMA-status" })).toBeTruthy()
    expect(screen.getByRole("status").textContent).toBe("VMA-information inte tillgänglig.")
    expect(screen.getByRole("alert").textContent).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "Försök igen" }))
    expect(retry).toHaveBeenCalledTimes(1)

    rerender(<VmaBanner {...empty} unavailable offline retry={retry} />)
    expect(screen.getByRole("status").textContent).toBe(
      "VMA-information inte tillgänglig.Ingen internetanslutning."
    )
    expect(screen.queryByRole("button", { name: "Försök igen" })).toBe(null)
  })

  it("keeps the retry control in place and blocks another click while a retry is pending", () => {
    const retry = vi.fn()
    const { rerender } = render(<VmaBanner {...empty} unavailable retry={retry} />)
    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Försök igen" })
    button.focus()
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledTimes(1)
    rerender(<VmaBanner {...empty} loading retrying retry={retry} />)
    expect(screen.getByRole("status").textContent).toBe("Kontrollerar VMA…")
    expect(screen.getByRole("button", { name: "Kontrollerar…" })).toBe(button)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("keeps an active warning and its status unchanged while a manual retry is pending", () => {
    const stale = {
      ...empty,
      message,
      activeMessages: [message],
      stale: true,
      lastCheckedAt: checkedAt,
    }
    const { rerender } = render(<VmaBanner {...stale} />)
    const heading = screen.getByRole("heading", { name: info.event })
    const statusText = screen.getByRole("status").textContent
    rerender(<VmaBanner {...stale} retrying />)
    expect(screen.getByRole("heading", { name: info.event })).toBe(heading)
    expect(screen.getByRole("status").textContent).toBe(statusText)
    expect(screen.queryByText("Kontrollerar VMA…")).toBe(null)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Kontrollerar…" }).disabled).toBe(
      true
    )
  })

  it("shows a retained warning as possibly outdated with the backend's last check time", () => {
    const { rerender } = render(
      <VmaBanner
        {...empty}
        message={message}
        activeMessages={[message]}
        stale
        lastCheckedAt={checkedAt}
      />
    )
    expect(screen.getByRole("heading").textContent).toBe(info.event)
    expect(screen.getByRole("status").textContent).toBe(
      "VMA-informationen kan vara inaktuell. Senast kontrollerad kl. 14:00."
    )
    expect(screen.getByRole("button", { name: "Försök igen" })).toBeTruthy()

    vi.spyOn(Date, "now").mockReturnValue(now + 86_400_000)
    rerender(
      <VmaBanner
        {...empty}
        message={message}
        activeMessages={[message]}
        stale
        offline
        lastCheckedAt={checkedAt}
      />
    )
    expect(screen.getByRole("status").textContent).toBe(
      "VMA-informationen kan vara inaktuell. Senast kontrollerad den 5 oktober kl. 14:00." +
        "Ingen internetanslutning."
    )
    expect(screen.queryByRole("button", { name: "Försök igen" })).toBe(null)
  })

  it("keeps the status region unchanged when a poll leaves the state unchanged", () => {
    const stale = { ...empty, stale: true, lastCheckedAt: checkedAt }
    const { rerender } = render(<VmaBanner {...stale} />)
    const status = screen.getByRole("status")
    const line = status.firstChild
    rerender(<VmaBanner {...stale} />)
    expect(screen.getByRole("status")).toBe(status)
    expect(status.firstChild).toBe(line)
  })

  it("announces recovery from outdated or unavailable information, but not the first load", () => {
    const { container, rerender } = render(<VmaBanner {...empty} loading />)
    const recovery = () => container.querySelectorAll("[aria-live='polite']")[1].textContent
    rerender(<VmaBanner {...empty} />)
    expect(recovery()).toBe("")

    rerender(<VmaBanner {...empty} stale lastCheckedAt={checkedAt} />)
    expect(recovery()).toBe("")
    rerender(<VmaBanner {...empty} lastCheckedAt={checkedAt} />)
    expect(recovery()).toBe("VMA-informationen är uppdaterad.")

    rerender(<VmaBanner {...empty} unavailable />)
    expect(recovery()).toBe("")
    rerender(<VmaBanner {...empty} loading retrying />)
    expect(recovery()).toBe("")
    rerender(<VmaBanner {...empty} message={message} activeMessages={[message]} />)
    expect(recovery()).toBe("VMA-informationen är uppdaterad.")
  })
})
