import type { RefObject } from "react"
import { NavLink } from "react-router-dom"

interface NavigationItem {
  to: string
  label: string
  end: boolean
}

const navigationItems: readonly NavigationItem[] = [
  { to: "/", label: "Hem", end: true },
  { to: "/crisis", label: "Krisinformation", end: true },
  { to: "/crisis-kit", label: "Min krislåda", end: true },
  { to: "/min-info", label: "Min info", end: true },
]

interface BottomNavigationProps {
  navigationRef: RefObject<HTMLElement | null>
}

/**
 * Renders the same primary links at the mobile bottom edge and above wider page content.
 *
 * @param navigationRef Gives the shared layout access to the bar's measured height.
 */
function BottomNavigation({ navigationRef }: BottomNavigationProps) {
  return (
    <nav
      ref={navigationRef}
      aria-label="Huvudnavigation"
      className={
        "primary-navigation z-20 border-y border-slate-200 bg-white " +
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      }
    >
      <ul className="mx-auto flex w-full max-w-4xl flex-nowrap gap-2 px-4 py-1 sm:px-6">
        {navigationItems.map(({ to, label, end }) => (
          <li key={to} className="min-w-0 flex-[1_1_8rem] md:flex-initial">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                "grid h-full min-h-6 min-w-6 place-items-center rounded-xl overflow-none" +
                "px-2 py-1 md:px-4 " +
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
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default BottomNavigation
