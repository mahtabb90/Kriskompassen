// @vitest-environment jsdom
import { createRef } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import { installPromptEvent } from "../services/__fixtures__/installPrompt"
import { installPromptService } from "../services/installPromptService"
import BottomNavigation from "./BottomNavigation"
import { navigationItems } from "./navigationItems"

afterEach(cleanup)

function mountNavigation(initialPath = "/") {
  const navigationRef = createRef<HTMLElement>()
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNavigation navigationRef={navigationRef} />
    </MemoryRouter>
  )
  return { navigationRef }
}

describe("BottomNavigation", () => {
  it("renders every shared item as one landmark with one list of links", () => {
    const { navigationRef } = mountNavigation()
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
    expect(screen.getByRole("navigation", { name: "Huvudnavigation" })).toBe(navigationRef.current)
    expect(screen.getAllByRole("list")).toHaveLength(1)
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
      navigationItems.map((item) => item.to)
    )
    expect(screen.getByRole("link", { name: "Krisinformation" })).toBeTruthy()
  })

  it("exposes only the current route with aria-current", () => {
    mountNavigation("/min-info")
    const current = screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute("aria-current")).toBe("page")
    expect(current[0].textContent).toContain("Min info")
  })

  it("has no scroll controls and navigates in place", () => {
    mountNavigation()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    fireEvent.click(screen.getByRole("link", { name: "Min info" }))
    expect(screen.getByRole("link", { name: "Min info" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByRole("link", { name: "Hem" }).hasAttribute("aria-current")).toBe(false)
  })
})

describe("BottomNavigation install button", () => {
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

  it("follows the link list without becoming a list item", () => {
    offerInstall()
    mountNavigation()
    const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
    const install = within(navigation).getByRole("button", { name: "Installera app" })
    expect(screen.getAllByRole("listitem")).toHaveLength(navigationItems.length)
    expect(screen.getByRole("list").contains(install)).toBe(false)
  })

  it("prompts, disappears and moves focus to the page heading", () => {
    const event = offerInstall()
    mountNavigation()
    render(
      <h1 id="page-heading" tabIndex={-1}>
        Hem
      </h1>
    )
    const install = screen.getByRole("button", { name: "Installera app" })
    install.focus()

    fireEvent.click(install)

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole("button", { name: "Installera app" })).toBe(null)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
  })
})
