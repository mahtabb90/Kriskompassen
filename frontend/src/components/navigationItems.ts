export interface NavigationItem {
  to: string
  label: string
  end: boolean
}

/**
 * The primary routes, in display order, shared by the desktop navigation and the mobile menu.
 *
 * Add new public links here and register their routes in App.tsx.
 */
export const navigationItems: readonly NavigationItem[] = [
  { to: "/", label: "Hem", end: true },
  { to: "/crisis", label: "Krisinformation", end: true },
  { to: "/crisis-kit", label: "Min krislåda", end: true },
  { to: "/min-info", label: "Min info", end: true },
]
