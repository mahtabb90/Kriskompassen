import { useLayoutEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"
import BottomNavigation from "./BottomNavigation"
import Header from "./Header"

/**
 * Provides shared landmarks, navigation spacing and accessible route transitions.
 *
 * Child pages supply one h1 with id="page-heading" and tabIndex={-1}. Its text sets
 * the document title. Path changes focus that heading and scroll only as needed to
 * reveal it; initial loads and hash-only changes preserve browser focus. The measured
 * navigation height reserves scroll space for content above the fixed mobile bar.
 */
function AppLayout() {
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const main = mainRef.current
    const navigation = navigationRef.current
    if (!main || !navigation) return

    const root = document.documentElement
    const previousHeight = root.style.getPropertyValue("--navigation-height")
    let focusFrame = 0

    const keepFocusedContentVisible = () => {
      const focused = document.activeElement
      if (
        !(focused instanceof HTMLElement) ||
        focused === main ||
        !main.contains(focused) ||
        getComputedStyle(navigation).position !== "fixed"
      )
        return

      const visibleBottom = navigation.getBoundingClientRect().top - 8
      const focusedBottom = focused.getBoundingClientRect().bottom
      if (focusedBottom > visibleBottom) {
        window.scrollBy({ top: focusedBottom - visibleBottom, behavior: "instant" })
      }
    }

    const scheduleFocusCheck = () => {
      cancelAnimationFrame(focusFrame)
      // Check after the browser's own focus scrolling has finished.
      focusFrame = requestAnimationFrame(keepFocusedContentVisible)
    }

    const updateNavigationSpace = () => {
      const height =
        getComputedStyle(navigation).position === "fixed"
          ? Math.ceil(navigation.getBoundingClientRect().height)
          : 0

      root.style.setProperty("--navigation-height", `${height}px`)
      scheduleFocusCheck()
    }

    const observer = new ResizeObserver(updateNavigationSpace)
    observer.observe(navigation)
    window.addEventListener("resize", updateNavigationSpace)
    main.addEventListener("focusin", scheduleFocusCheck)
    updateNavigationSpace()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateNavigationSpace)
      main.removeEventListener("focusin", scheduleFocusCheck)
      cancelAnimationFrame(focusFrame)
      if (previousHeight) {
        root.style.setProperty("--navigation-height", previousHeight)
      } else {
        root.style.removeProperty("--navigation-height")
      }
    }
  }, [])

  useLayoutEffect(() => {
    const main = mainRef.current
    if (!main) return

    // A descendant's own state update (e.g. offline-mode content replacing a "loading"
    // heading once it arrives from IndexedDB) can swap in an entirely new heading element
    // — not just change its text — without re-rendering AppLayout. So this re-queries for
    // whichever #page-heading currently exists on every subtree mutation, rather than
    // watching one captured node that may already have been removed.
    const syncTitle = () => {
      const heading = main.querySelector<HTMLHeadingElement>("#page-heading")
      document.title = heading ? `${heading.textContent?.trim()} | KrisKompassen` : "KrisKompassen"
    }
    syncTitle()

    const observer = new MutationObserver(syncTitle)
    observer.observe(main, { characterData: true, childList: true, subtree: true })

    return () => observer.disconnect()
  }, [pathname])

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname

    const heading = mainRef.current?.querySelector<HTMLHeadingElement>("#page-heading")
    // Keep the header and navigation in place when the heading is already visible.
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
  }, [pathname])

  return (
    <div
      className={
        "min-h-dvh bg-[#D7E2EF] text-slate-800 " +
        "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      }
    >
      <a
        href="#main-content"
        onClick={() => mainRef.current?.focus({ preventScroll: true })}
        className={
          "sr-only focus:fixed focus:inset-x-4 focus:top-4 focus:z-50 focus:m-0 " +
          "focus:h-auto focus:w-fit focus:max-w-[calc(100%-2rem)] focus:overflow-visible " +
          "focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-blue-900 " +
          "focus:whitespace-normal focus:[clip:auto]"
        }
      >
        Hoppa till huvudinnehållet
      </a>
      <Header />
      <BottomNavigation navigationRef={navigationRef} />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        aria-labelledby="page-heading"
        className={
          "mx-auto w-full max-w-4xl scroll-mt-4 px-4 pt-8 wrap-anywhere " +
          "pb-[calc(var(--navigation-height,0px)+2rem)] sm:px-6 sm:pt-10"
        }
      >
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
