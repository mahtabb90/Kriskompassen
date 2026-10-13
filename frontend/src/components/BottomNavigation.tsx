import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { NavLink, useLocation } from "react-router-dom"

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

function revealLink(list: HTMLUListElement, link: HTMLElement) {
  if (!list.clientWidth) return
  const viewport = list.getBoundingClientRect()
  const bounds = link.getBoundingClientRect()
  // Leave room for the outward focus outline inside the scrolling viewport.
  const inset = parseFloat(getComputedStyle(list).paddingLeft) || 8
  const distance =
    bounds.left < viewport.left + inset
      ? bounds.left - viewport.left - inset
      : Math.max(0, bounds.right - viewport.right + inset)
  if (distance) list.scrollBy({ left: distance, behavior: "instant" })
}

/**
 * Renders the same primary links at the mobile bottom edge and above wider page content.
 *
 * Only the fixed bottom bar scrolls horizontally. Overflow enables directional controls.
 * Focus from the keyboard or scripts and route changes reveal links without moving page content.
 * Pointer focus preserves pending selection. Desktop and normal-flow navigation retain their
 * wrapping layout. Scroll controls respect reduced motion.
 *
 * @param navigationRef Gives the shared layout access to the bar's measured height.
 */
function BottomNavigation({ navigationRef }: BottomNavigationProps) {
  const { pathname } = useLocation()
  const shellRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const pointerSelection = useRef(false)
  const [scrollState, setScrollState] = useState({
    overflow: false,
    left: false,
    right: false,
  })

  const measureScroll = useCallback(() => {
    const navigation = navigationRef.current
    const shell = shellRef.current
    const list = listRef.current
    if (!navigation || !shell || !list) return
    const shellStyle = getComputedStyle(shell)
    // Compare against the width without arrows, so adding controls cannot create overflow.
    const availableWidth =
      shell.clientWidth -
      (parseFloat(shellStyle.paddingLeft) || 0) -
      (parseFloat(shellStyle.paddingRight) || 0)
    const overflow =
      getComputedStyle(navigation).position === "fixed" && list.scrollWidth > availableWidth + 1
    const next = {
      overflow,
      left: overflow && list.scrollLeft > 1,
      right: overflow && list.scrollWidth - list.clientWidth - list.scrollLeft > 1,
    }
    if (
      !overflow &&
      document.activeElement instanceof HTMLButtonElement &&
      shell.contains(document.activeElement)
    ) {
      const target =
        list.querySelector<HTMLElement>("[aria-current='page']") ??
        list.querySelector<HTMLElement>("a")
      target?.focus({ preventScroll: true })
    }
    setScrollState((previous) =>
      previous.overflow === next.overflow &&
      previous.left === next.left &&
      previous.right === next.right
        ? previous
        : next
    )
  }, [navigationRef])

  useLayoutEffect(() => {
    const navigation = navigationRef.current
    const shell = shellRef.current
    const list = listRef.current
    if (!navigation || !shell || !list) return
    const observer = new ResizeObserver(measureScroll)
    observer.observe(shell)
    observer.observe(list)
    for (const item of list.children) observer.observe(item)
    // The shared layout can return a tall bottom bar to normal flow without a resize.
    const placementObserver = new MutationObserver(measureScroll)
    placementObserver.observe(navigation, {
      attributes: true,
      attributeFilter: ["data-overflows-viewport"],
    })
    const onResize = () => {
      measureScroll()
      const current = list.querySelector<HTMLElement>("[aria-current='page']")
      if (current && getComputedStyle(navigation).position === "fixed") revealLink(list, current)
    }
    window.addEventListener("resize", onResize)
    measureScroll()
    return () => {
      observer.disconnect()
      placementObserver.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [measureScroll, navigationRef])

  useLayoutEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>("[aria-current='page']")
    if (list && current && scrollState.overflow) revealLink(list, current)
  }, [pathname, scrollState.overflow])

  const scrollMenu = (direction: -1 | 1) => {
    const list = listRef.current
    if (!list || !(direction < 0 ? scrollState.left : scrollState.right)) return
    list.scrollBy({
      left: direction * Math.max(48, list.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }

  const controlClasses =
    "navigation-scroll-control min-h-12 min-w-12 items-center justify-center " +
    "rounded-xl border-2 border-blue-900 bg-white text-blue-900 cursor-pointer " +
    "hover:bg-blue-50 aria-disabled:cursor-default aria-disabled:opacity-40 " +
    "aria-disabled:hover:bg-white"

  const endPointerSelection = () => {
    pointerSelection.current = false
  }

  return (
    <nav
      ref={navigationRef}
      aria-label="Huvudnavigation"
      data-scrollable={scrollState.overflow || undefined}
      className={
        "primary-navigation z-20 border-t-2 border-b border-t-[#D7E2EF] border-b-slate-200 bg-white " +
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      }
    >
      <div ref={shellRef} className="navigation-scroll-shell mx-auto w-full max-w-4xl">
        <button
          type="button"
          hidden={!scrollState.overflow}
          className={controlClasses}
          aria-label="Rulla menyn åt vänster"
          aria-controls="primary-navigation-links"
          aria-disabled={!scrollState.left}
          tabIndex={scrollState.left ? 0 : -1}
          onClick={() => scrollMenu(-1)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="m15 6-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <ul
          ref={listRef}
          id="primary-navigation-links"
          className="navigation-links mx-auto flex w-full max-w-4xl flex-wrap gap-2 px-4 py-3 sm:px-6"
          onScroll={measureScroll}
          onPointerDownCapture={() => {
            pointerSelection.current = true
          }}
          onPointerCancelCapture={endPointerSelection}
          onPointerLeave={endPointerSelection}
          onClickCapture={endPointerSelection}
          onKeyDownCapture={endPointerSelection}
          onFocusCapture={(event) => {
            // Moving a clipped link during pointer focus can cancel its pending click.
            if (listRef.current && scrollState.overflow && !pointerSelection.current) {
              revealLink(listRef.current, event.target)
            }
          }}
        >
          {navigationItems.map(({ to, label, end }) => (
            <li key={to} className="min-w-0 flex-[1_1_8rem] md:flex-initial">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  "grid h-full min-h-12 min-w-12 place-items-center rounded-xl " +
                  "px-2 py-3 md:px-4 " +
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
        <button
          type="button"
          hidden={!scrollState.overflow}
          className={controlClasses}
          aria-label="Rulla menyn åt höger"
          aria-controls="primary-navigation-links"
          aria-disabled={!scrollState.right}
          tabIndex={scrollState.right ? 0 : -1}
          onClick={() => scrollMenu(1)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="m9 6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </nav>
  )
}

export default BottomNavigation
