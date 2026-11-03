import { matchPath } from "react-router-dom"

export interface NavigationItem {
  to: string
  label: string
  end: boolean
  /**
   * Route patterns on which this item is the current page, when it covers more than its own `to`
   * (for example an overview and its subpages). Without it, only `to` matches.
   */
  activePaths?: readonly string[]
}

/**
 * The primary routes, in display order, shared by the desktop navigation and the mobile menu.
 *
 * Add new public links here and register their routes in App.tsx.
 */
export const navigationItems: readonly NavigationItem[] = [
  { to: "/", label: "Hem", end: true },
  {
    to: "/crisis",
    label: "Krisinformation",
    end: true,
    activePaths: [
      "/krisinformation",
      "/crisis",
      "/crisis/:id",
      "/telefonnummer",
      "/varningssignaler",
    ],
  },
  { to: "/crisis-kit", label: "Min krislåda", end: true },
  { to: "/skyddsrum", label: "Skyddsrum", end: true },
  { to: "/installningar", label: "Inställningar", end: true },
  { to: "/lugn-i-kris", label: "Lugn i kris", end: true },
]

/**
 * Tells whether a navigation item represents the current page.
 *
 * Matches the pathname against the item's `activePaths`, or against its `to` when it has none,
 * with React Router's `matchPath` and the item's `end` setting, so it agrees with how the router
 * resolves the same paths.
 *
 * @param item The navigation item to check.
 * @param pathname The current location's pathname.
 * @returns True when the item should be marked as the current page.
 */
export function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
  const patterns = item.activePaths ?? [item.to]
  return patterns.some((path) => matchPath({ path, end: item.end }, pathname) !== null)
}
