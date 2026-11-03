// @vitest-environment jsdom
import { createRef } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
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
    mountNavigation("/installningar")
    const current = screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute("aria-current")).toBe("page")
    expect(current[0].textContent).toContain("Inställningar")
  })

  it.each(["/telefonnummer", "/crisis/food-in-crisis", "/lugn-i-kris"])(
    "keeps Krisinformation current on the krisinfo subpage %s",
    (path) => {
      mountNavigation(path)
      const current = screen
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current"))
      expect(current).toHaveLength(1)
      expect(current[0].getAttribute("aria-current")).toBe("page")
      expect(current[0].textContent).toContain("Krisinformation")
      expect(current[0].className).toContain("underline")
    }
  )

  it("has no scroll controls and navigates in place", () => {
    mountNavigation()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    fireEvent.click(screen.getByRole("link", { name: "Inställningar" }))
    expect(screen.getByRole("link", { name: "Inställningar" }).getAttribute("aria-current")).toBe(
      "page"
    )
    expect(screen.getByRole("link", { name: "Hem" }).hasAttribute("aria-current")).toBe(false)
  })
})
