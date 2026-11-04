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

  it("sticks below the VMA banner on a solid surface from 48rem and stays hidden below it", () => {
    mountNavigation()
    const classes = [...screen.getByRole("navigation", { name: "Huvudnavigation" }).classList]
    expect(classes).toEqual(
      expect.arrayContaining([
        "max-md:hidden",
        "md:sticky",
        "md:top-[var(--vma-banner-height,0px)]",
        "md:z-20",
        "bg-white",
        "md:shadow-sm",
        "border-b-slate-200",
      ])
    )
    // Sticky placement must not apply below the breakpoint, where MobileMenu takes over.
    expect(classes).not.toContain("sticky")
  })

  it("keeps marking the current route while sticky", () => {
    mountNavigation("/skyddsrum")
    const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
    expect(navigation.classList).toContain("md:sticky")
    const current = screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain("Skyddsrum")
    expect(current[0].className).toContain("bg-blue-900")
    expect(current[0].className).toContain("underline")
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
