// @vitest-environment jsdom
import { createRef } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installPromptEvent } from "../services/__fixtures__/installPrompt"
import { installPromptService } from "../services/installPromptService"
import { installDialogTestMethods } from "./__fixtures__/dialog"
import MobileMenu from "./MobileMenu"
import { navigationItems } from "./navigationItems"

let restoreDialog: () => void
let desktop = false
let viewportListeners: Array<() => void> = []

function Pathname() {
  return <p data-testid="pathname">{useLocation().pathname}</p>
}

function mountMenu(initialPath = "/") {
  const triggerRef = createRef<HTMLButtonElement>()
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MobileMenu triggerRef={triggerRef} />
      <Pathname />
      <h1 id="page-heading" tabIndex={-1}>
        Sida
      </h1>
    </MemoryRouter>
  )
  return { ...view, trigger: screen.getByRole("button", { name: "Meny" }), triggerRef }
}

function openMenu(initialPath = "/") {
  const mounted = mountMenu(initialPath)
  fireEvent.click(mounted.trigger)
  return { ...mounted, dialog: screen.getByRole<HTMLDialogElement>("dialog", { name: "Meny" }) }
}

beforeEach(() => {
  restoreDialog = installDialogTestMethods()
  desktop = false
  viewportListeners = []
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return desktop
    },
    addEventListener: (_type: string, listener: () => void) => viewportListeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) => {
      viewportListeners = viewportListeners.filter((item) => item !== listener)
    },
  }))
})

afterEach(() => {
  cleanup()
  restoreDialog()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.style.removeProperty("overflow")
  document.body.style.removeProperty("overflow")
})

describe("MobileMenu", () => {
  it("starts closed with a collapsed trigger and no exposed dialog or links", () => {
    const { trigger } = mountMenu()
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(trigger.getAttribute("aria-controls")).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(screen.queryAllByRole("link")).toHaveLength(0)
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })

  it("opens a labelled modal with the shared links in order and focuses its heading", () => {
    const { trigger, dialog } = openMenu()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(within(dialog).getByRole("heading", { name: "Meny" }))
    const links = within(dialog).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Hem",
      "Krisinformation",
      "Min krislåda",
      "Min info",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      navigationItems.map((item) => item.to)
    )
    expect(within(dialog).getByRole("button", { name: "Stäng menyn" })).toBeTruthy()
  })

  it("marks only the current route with aria-current", () => {
    const { dialog } = openMenu("/crisis")
    const current = within(dialog)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-current"))
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute("aria-current")).toBe("page")
    expect(current[0].textContent).toBe("Krisinformation")
  })

  it("closes with Stäng menyn and returns focus to the trigger", () => {
    const { trigger, dialog } = openMenu()
    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng menyn" }))
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(trigger)
  })

  it("treats a native close such as Escape like a manual close", () => {
    const { trigger, dialog } = openMenu()
    // Escape makes the browser close the modal dialog; jsdom has no such key handling.
    act(() => dialog.close())
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(trigger)
  })

  it("can be reopened after closing", () => {
    const { trigger, dialog } = openMenu()
    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng menyn" }))
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByRole("dialog", { name: "Meny" })).toBeTruthy()
  })

  it("navigates to another route, closes and leaves focus to the layout", () => {
    const { trigger, dialog } = openMenu()
    const link = within(dialog).getByRole("link", { name: "Krisinformation" })
    link.focus()
    fireEvent.click(link)
    expect(screen.getByTestId("pathname").textContent).toBe("/crisis")
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).not.toBe(trigger)
  })

  it("does not keep a stale navigation reason for the next manual close", () => {
    const { trigger, dialog } = openMenu()
    fireEvent.click(within(dialog).getByRole("link", { name: "Krisinformation" }))
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole("button", { name: "Stäng menyn" }))
    expect(document.activeElement).toBe(trigger)
  })

  it("closes on selecting the current route and returns focus to the trigger", () => {
    const { trigger, dialog } = openMenu("/crisis")
    fireEvent.click(within(dialog).getByRole("link", { name: "Krisinformation" }))
    expect(screen.getByTestId("pathname").textContent).toBe("/crisis")
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(document.activeElement).toBe(trigger)
  })

  it("navigates while the browser reports no connection", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const { dialog } = openMenu()
    fireEvent.click(within(dialog).getByRole("link", { name: "Min info" }))
    expect(screen.getByTestId("pathname").textContent).toBe("/min-info")
  })

  it("locks page scrolling while open and restores previous values on close", () => {
    document.documentElement.style.overflow = "auto"
    document.body.style.setProperty("overflow", "scroll")
    const { dialog } = openMenu()
    expect(document.documentElement.style.overflow).toBe("hidden")
    expect(document.body.style.overflow).toBe("hidden")
    fireEvent.click(within(dialog).getByRole("button", { name: "Stäng menyn" }))
    expect(document.documentElement.style.overflow).toBe("auto")
    expect(document.body.style.overflow).toBe("scroll")
  })

  it("wraps Tab and Shift+Tab between the first and last control", () => {
    const { dialog } = openMenu()
    const first = within(dialog).getByRole("button", { name: "Stäng menyn" })
    const last = within(dialog).getByRole("link", { name: "Min info" })
    last.focus()
    fireEvent.keyDown(last, { key: "Tab" })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it("closes at desktop width, focusing the page heading instead of the hidden trigger", () => {
    const { trigger } = openMenu()
    const focus = vi.spyOn(trigger, "focus")
    desktop = true
    act(() => viewportListeners.forEach((listener) => listener()))
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.documentElement.style.overflow).toBe("")
    expect(focus).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.getElementById("page-heading"))
    expect(screen.getByTestId("pathname").textContent).toBe("/")
  })

  it("ignores viewport changes that stay below desktop width", () => {
    openMenu()
    for (const listener of viewportListeners) listener()
    expect(screen.getByRole("dialog", { name: "Meny" })).toBeTruthy()
  })

  it("releases the dialog, listeners and scroll lock on unmount", () => {
    const { dialog, unmount } = openMenu()
    unmount()
    expect(dialog.open).toBe(false)
    expect(viewportListeners).toHaveLength(0)
    expect(document.body.style.overflow).toBe("")
  })
})

describe("MobileMenu install button", () => {
  afterEach(() => {
    installPromptService.dispose()
  })

  function offerInstall() {
    installPromptService.start()
    const event = installPromptEvent()
    act(() => {
      window.dispatchEvent(event)
    })
    return event
  }

  it("is absent while the browser offers no installation", () => {
    const { dialog } = openMenu()
    expect(within(dialog).queryByRole("button", { name: "Installera app" })).toBe(null)
  })

  it("follows the links and becomes the last control for Tab wrapping", () => {
    offerInstall()
    const { dialog } = openMenu()
    const install = within(dialog).getByRole("button", { name: "Installera app" })
    const first = within(dialog).getByRole("button", { name: "Stäng menyn" })
    expect(within(dialog).getByRole("list").contains(install)).toBe(false)
    install.focus()
    fireEvent.keyDown(install, { key: "Tab" })
    expect(document.activeElement).toBe(first)
  })

  it("prompts, closes the menu and returns focus to the trigger instead of the page heading", () => {
    const event = offerInstall()
    const { trigger, dialog } = openMenu()
    const install = within(dialog).getByRole("button", { name: "Installera app" })
    install.focus()

    fireEvent.click(install)

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole("dialog")).toBe(null)
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(trigger)
  })
})
