import { describe, expect, it } from "vitest"
import { isNavigationItemActive, navigationItems, type NavigationItem } from "./navigationItems"

function item(label: string): NavigationItem {
  const found = navigationItems.find((candidate) => candidate.label === label)
  if (!found) throw new Error(`No navigation item ${label}`)
  return found
}

function currentLabels(pathname: string) {
  return navigationItems
    .filter((candidate) => isNavigationItemActive(candidate, pathname))
    .map((candidate) => candidate.label)
}

describe("isNavigationItemActive", () => {
  it.each([
    "/krisinformation",
    "/crisis",
    "/crisis/food-in-crisis",
    "/telefonnummer",
    "/varningssignaler",
  ])("marks Krisinformation, and only it, as current on %s", (pathname) => {
    expect(currentLabels(pathname)).toEqual(["Krisinformation"])
  })

  it.each(["/crisis-kit", "/skyddsrum", "/installningar", "/", "/crisis/food-in-crisis/extra"])(
    "does not mark Krisinformation as current on %s",
    (pathname) => {
      expect(isNavigationItemActive(item("Krisinformation"), pathname)).toBe(false)
    }
  )

  it("matches an item without activePaths on its own path only", () => {
    expect(isNavigationItemActive(item("Hem"), "/")).toBe(true)
    expect(isNavigationItemActive(item("Hem"), "/crisis")).toBe(false)
    expect(isNavigationItemActive(item("Skyddsrum"), "/skyddsrum")).toBe(true)
    expect(isNavigationItemActive(item("Skyddsrum"), "/skyddsrum/karta")).toBe(false)
  })

  it("ignores a trailing slash, as the router does", () => {
    expect(isNavigationItemActive(item("Krisinformation"), "/telefonnummer/")).toBe(true)
    expect(isNavigationItemActive(item("Inställningar"), "/installningar/")).toBe(true)
  })

  it("marks at most one item as current on every listed path", () => {
    const paths = navigationItems.flatMap((candidate) => candidate.activePaths ?? [candidate.to])
    for (const path of paths) {
      expect(currentLabels(path.replace(":id", "x")).length).toBeLessThanOrEqual(1)
    }
  })
})
