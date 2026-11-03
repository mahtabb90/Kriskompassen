import type { RefObject } from "react"
import { Link, useLocation } from "react-router-dom"
import { isNavigationItemActive, navigationItems } from "./navigationItems"

interface BottomNavigationProps {
  navigationRef: RefObject<HTMLElement | null>
}

/**
 * Renders the primary links in normal flow beneath the header from 48rem upwards.
 *
 * Below 48rem this bar is hidden and MobileMenu provides the same links. The links come from the
 * shared navigationItems list and wrap onto further rows instead of scrolling. The current page
 * is decided by `isNavigationItemActive`, so an item can stay current on its subpages.
 *
 * @param navigationRef Gives the shared layout access to the landmark for focus visibility checks.
 */
function BottomNavigation({ navigationRef }: BottomNavigationProps) {
  const { pathname } = useLocation()

  return (
    <nav
      ref={navigationRef}
      aria-label="Huvudnavigation"
      className={
        "border-t-2 border-b border-t-[#D7E2EF] border-b-slate-200 bg-white " +
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] max-md:hidden"
      }
    >
      <ul className="mx-auto flex w-full max-w-4xl flex-wrap gap-2 px-4 py-3 sm:px-6">
        {navigationItems.map((item) => {
          const { to, label } = item
          const isActive = isNavigationItemActive(item, pathname)
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={
                  "grid h-full min-h-12 min-w-12 place-items-center rounded-xl px-4 py-3 " +
                  "text-center text-base leading-normal wrap-anywhere " +
                  (isActive
                    ? "bg-blue-900 font-bold text-white underline decoration-2 underline-offset-4"
                    : "font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900")
                }
              >
                {/* Reserve the bold label's width so the current-page style does not move links. */}
                <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-bold">
                  {label}
                </span>
                <span className="col-start-1 row-start-1">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default BottomNavigation
