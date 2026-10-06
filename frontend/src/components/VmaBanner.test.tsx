// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { feed, info, now, source } from "../services/__fixtures__/vma"
import { mapVmaMessages } from "../services/vmaMapper"
import { validateVmaResponse } from "../services/vmaResponseValidator"
import VmaBanner from "./VmaBanner"

const message = mapVmaMessages(validateVmaResponse(feed()).records, source, now)[0]
const empty = {
  message: null,
  hasMore: false,
  uncertain: false,
  loading: false,
  retrying: false,
  failed: false,
  lastCheckedAt: null,
  retry: vi.fn(),
}

afterEach(cleanup)

describe("VmaBanner", () => {
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

  it.each(["loading", "failed", "uncertain"] as const)(
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

  it("mentions additional active VMA without adding a list or selecting another warning", () => {
    render(<VmaBanner {...empty} message={message} hasMore />)
    expect(screen.getByRole("complementary").textContent).toContain("Fler aktiva VMA finns.")
    expect(screen.getAllByRole("heading")).toHaveLength(1)
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

  it("keeps the retry control in place and blocks another click while a retry is pending", () => {
    const retry = vi.fn()
    const { rerender } = render(<VmaBanner {...empty} failed retry={retry} />)
    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Försök igen" })
    button.focus()
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("status").textContent).toBe("VMA-status kunde inte kontrolleras.")
    rerender(<VmaBanner {...empty} loading retrying retry={retry} />)
    expect(screen.getByRole("button")).toBe(button)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it("displays retained warning text and the time of its last successful check alongside a failure", () => {
    render(
      <VmaBanner {...empty} message={message} failed lastCheckedAt={new Date(now).toISOString()} />
    )
    expect(screen.getByRole("heading").textContent).toBe(info.event)
    const status = screen.getByRole("status")
    expect(status.textContent).toContain("VMA-status kunde inte kontrolleras.")
    expect(status.textContent).toContain("Senast kontrollerat")
    expect(status.querySelector("time")?.dateTime).toBe(new Date(now).toISOString())
  })
})
