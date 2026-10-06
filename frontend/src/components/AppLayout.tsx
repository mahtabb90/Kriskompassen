import { useLayoutEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useVmaBanner } from "../hooks/useVmaBanner"
import BottomNavigation from "./BottomNavigation"
import Header from "./Header"
import VmaBanner from "./VmaBanner"

/**
 * Provides shared landmarks, navigation spacing and accessible route transitions.
 *
 * Child pages supply one h1 with id="page-heading" and tabIndex={-1}. Its text sets
 * the document title. Path changes focus that heading and scroll only as needed to
 * reveal it; initial loads and hash-only changes preserve browser focus. The measured
 * navigation and VMA notice heights reserve scroll space between the fixed mobile bar and the
 * sticky top notice. VMA requests belong to this persistent layout, not individual routes.
 */
function AppLayout() {
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const vma = useVmaBanner()
  const noticeVisible = Boolean(vma.message || vma.loading || vma.failed || vma.uncertain)

  useLayoutEffect(() => {
    const main = mainRef.current
    const navigation = navigationRef.current
    const banner = bannerRef.current
    if (!main || !navigation || !banner) return

    const root = document.documentElement
    const previousHeight = root.style.getPropertyValue("--navigation-height")
    const previousBannerHeight = root.style.getPropertyValue("--vma-banner-height")
    let focusFrame = 0

    const keepFocusedContentVisible = () => {
      const focused = document.activeElement
      if (
        !(focused instanceof HTMLElement) ||
        banner.contains(focused) ||
        (!main.contains(focused) && !navigation.contains(focused))
      )
        return

      const fixedNavigation = getComputedStyle(navigation).position === "fixed"
      if (fixedNavigation && navigation.contains(focused)) return
      const visibleTop = banner.getBoundingClientRect().bottom + 8
      const visibleBottom = fixedNavigation
        ? navigation.getBoundingClientRect().top - 8
        : window.innerHeight - 8
      const focusedBounds = focused.getBoundingClientRect()
      if (focusedBounds.top < visibleTop) {
        window.scrollBy({ top: focusedBounds.top - visibleTop, behavior: "instant" })
      } else if (
        focusedBounds.bottom > visibleBottom &&
        focusedBounds.height <= visibleBottom - visibleTop
      ) {
        window.scrollBy({ top: focusedBounds.bottom - visibleBottom, behavior: "instant" })
      }
    }

    const scheduleFocusCheck = () => {
      cancelAnimationFrame(focusFrame)
      // Check after the browser's own focus scrolling has finished.
      focusFrame = requestAnimationFrame(keepFocusedContentVisible)
    }

    const updateReservedSpace = () => {
      const height =
        getComputedStyle(navigation).position === "fixed"
          ? Math.ceil(navigation.getBoundingClientRect().height)
          : 0

      root.style.setProperty("--navigation-height", `${height}px`)
      root.style.setProperty(
        "--vma-banner-height",
        `${Math.ceil(banner.getBoundingClientRect().height)}px`
      )
      scheduleFocusCheck()
    }

    const observer = new ResizeObserver(updateReservedSpace)
    observer.observe(navigation)
    observer.observe(banner)
    window.addEventListener("resize", updateReservedSpace)
    main.addEventListener("focusin", scheduleFocusCheck)
    navigation.addEventListener("focusin", scheduleFocusCheck)
    updateReservedSpace()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateReservedSpace)
      main.removeEventListener("focusin", scheduleFocusCheck)
      navigation.removeEventListener("focusin", scheduleFocusCheck)
      cancelAnimationFrame(focusFrame)
      if (previousHeight) {
        root.style.setProperty("--navigation-height", previousHeight)
      } else {
        root.style.removeProperty("--navigation-height")
      }
      if (previousBannerHeight) {
        root.style.setProperty("--vma-banner-height", previousBannerHeight)
      } else {
        root.style.removeProperty("--vma-banner-height")
      }
    }
  }, [])

  useLayoutEffect(() => {
    const heading = mainRef.current?.querySelector<HTMLHeadingElement>("#page-heading")
    document.title = heading ? `${heading.textContent?.trim()} | KrisKompassen` : "KrisKompassen"

    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      // Keep the header and navigation in place when the heading is already visible.
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
    }
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
      <div ref={bannerRef} className="sticky top-0 z-30">
        <VmaBanner {...vma} />
      </div>
      <Header reserveTopInset={!noticeVisible} />
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
