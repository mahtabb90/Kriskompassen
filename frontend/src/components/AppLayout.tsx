import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useVmaBanner } from "../hooks/useVmaBanner"
import { usePwaUpdate } from "../hooks/usePwaUpdate"
import BottomNavigation from "./BottomNavigation"
import Footer from "./Footer"
import Header from "./Header"
import InstallInstructions from "./InstallInstructions"
import MobileMenu from "./MobileMenu"
import VmaBanner from "./VmaBanner"
import PwaUpdateNotice from "./PwaUpdateNotice"
import VmaMessageDialog from "./VmaMessageDialog"
import type { VmaMessage } from "../types/vma"

/**
 * Provides shared landmarks, navigation spacing and accessible route transitions.
 *
 * Child pages supply one h1 with id="page-heading" and tabIndex={-1}. Its text sets
 * the document title. Path changes focus that heading and scroll only as needed to
 * reveal it; initial loads and hash-only changes preserve browser focus. This is the only route
 * focus owner; the mobile menu closes without focusing anything when a route is selected. The
 * measured mobile menu bar, VMA and app-update heights reserve scroll space around focused
 * content, and the bar reserves none from 48rem upwards. From 48rem the desktop navigation's
 * measured height is published as `--sticky-navigation-height` while it is sticky (0 otherwise),
 * so the sticky app-update notice, root scroll padding and focused content are placed below it;
 * focus inside the pinned navigation itself never scrolls the page. The shared `Footer` follows `main`
 * and is followed by a spacer for the menu bar's reserve, so it ends visibly above the bar. VMA requests and the update
 * subscription belong to this persistent layout, not individual routes.
 * Resize notifications defer measurement to avoid resizing observed elements during delivery.
 * A selected CAP snapshot, opened from the banner headline or its message list, stays readable
 * in a modal outside main while polling changes its feed validity or it leaves the banner.
 */
function AppLayout() {
  const { pathname } = useLocation()
  const previousPathname = useRef(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const mobileFooterRef = useRef<HTMLElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const updateRef = useRef<HTMLDivElement>(null)
  const vma = useVmaBanner()
  const update = usePwaUpdate()
  const noticeVisible = Boolean(
    vma.message || vma.loading || vma.unavailable || vma.stale || vma.uncertain
  )
  const [openedVma, setOpenedVma] = useState<{
    message: VmaMessage
    trigger: HTMLButtonElement
  } | null>(null)

  const openMessage = (message: VmaMessage, trigger: HTMLButtonElement) => {
    setOpenedVma({ message, trigger })
  }
  const closeMessage = useCallback(() => {
    if (!openedVma) return
    setOpenedVma(null)
    const { message, trigger } = openedVma
    const target =
      trigger.isConnected && trigger.dataset.vmaId === message.id
        ? trigger
        : mainRef.current?.querySelector<HTMLElement>("#page-heading")
    target?.focus({ preventScroll: true })
  }, [openedVma])

  useLayoutEffect(() => {
    const main = mainRef.current
    const navigation = navigationRef.current
    const mobileFooter = mobileFooterRef.current
    const banner = bannerRef.current
    const updateNotice = updateRef.current
    if (!main || !navigation || !mobileFooter || !banner || !updateNotice) return

    const root = document.documentElement
    const previousHeight = root.style.getPropertyValue("--navigation-height")
    const previousBannerHeight = root.style.getPropertyValue("--vma-banner-height")
    const previousUpdateHeight = root.style.getPropertyValue("--pwa-update-height")
    const previousStickyNavigationHeight = root.style.getPropertyValue("--sticky-navigation-height")
    let focusFrame = 0
    let measurementFrame = 0

    // The footer is fixed below 48rem and display: none from there upwards.
    const mobileFooterVisible = () => getComputedStyle(mobileFooter).display !== "none"

    const keepFocusedContentVisible = () => {
      const focused = document.activeElement

      // Don't scroll based on the bounds of the entire main content area.
      if (focused === main) return

      const stickyUpdate = getComputedStyle(updateNotice).position === "sticky"
      const stickyNavigation = getComputedStyle(navigation).position === "sticky"
      if (
        !(focused instanceof HTMLElement) ||
        banner.contains(focused) ||
        (stickyUpdate && updateNotice.contains(focused)) ||
        (stickyNavigation && navigation.contains(focused)) ||
        (!main.contains(focused) && !navigation.contains(focused))
      )
        return

      const bannerBottom = banner.getBoundingClientRect().bottom
      // Before the navigation is pinned its bottom is below the header, still above main content.
      const navigationBottom = stickyNavigation ? navigation.getBoundingClientRect().bottom : 0
      const updateBounds = updateNotice.getBoundingClientRect()
      const updateBottom = stickyUpdate && updateBounds.height > 0 ? updateBounds.bottom : 0
      const visibleTop = Math.max(bannerBottom, navigationBottom, updateBottom) + 8
      const visibleBottom = mobileFooterVisible()
        ? mobileFooter.getBoundingClientRect().top - 8
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
      // The footer's own height includes its safe-area padding.
      const height = mobileFooterVisible()
        ? Math.ceil(mobileFooter.getBoundingClientRect().height)
        : 0
      const bannerHeight = Math.ceil(banner.getBoundingClientRect().height)
      const updateHeight =
        getComputedStyle(updateNotice).position === "sticky"
          ? Math.ceil(updateNotice.getBoundingClientRect().height)
          : 0
      // The desktop navigation is sticky from 48rem and display: none below it.
      const stickyNavigationHeight =
        getComputedStyle(navigation).position === "sticky"
          ? Math.ceil(navigation.getBoundingClientRect().height)
          : 0

      // A mobile browser's address bar hiding/showing during scroll fires its own resize
      // events without any reserved space changing. Only re-run the focus check when one of
      // these heights actually changed, so it doesn't fight an in-progress scroll by pulling
      // the page back to whatever still holds focus.
      const changed =
        root.style.getPropertyValue("--navigation-height") !== `${height}px` ||
        root.style.getPropertyValue("--vma-banner-height") !== `${bannerHeight}px` ||
        root.style.getPropertyValue("--pwa-update-height") !== `${updateHeight}px` ||
        root.style.getPropertyValue("--sticky-navigation-height") !== `${stickyNavigationHeight}px`

      root.style.setProperty("--navigation-height", `${height}px`)
      root.style.setProperty("--vma-banner-height", `${bannerHeight}px`)
      root.style.setProperty("--pwa-update-height", `${updateHeight}px`)
      root.style.setProperty("--sticky-navigation-height", `${stickyNavigationHeight}px`)
      if (changed) scheduleFocusCheck()
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(measurementFrame)
      // Changing placement during resize delivery can resize the observed bar again.
      measurementFrame = requestAnimationFrame(updateReservedSpace)
    })
    observer.observe(mobileFooter)
    observer.observe(banner)
    observer.observe(updateNotice)
    observer.observe(navigation)
    const onViewportResize = () => {
      cancelAnimationFrame(measurementFrame)
      updateReservedSpace()
    }
    window.addEventListener("resize", onViewportResize)
    main.addEventListener("focusin", scheduleFocusCheck)
    navigation.addEventListener("focusin", scheduleFocusCheck)
    updateReservedSpace()

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", onViewportResize)
      main.removeEventListener("focusin", scheduleFocusCheck)
      navigation.removeEventListener("focusin", scheduleFocusCheck)
      cancelAnimationFrame(focusFrame)
      cancelAnimationFrame(measurementFrame)
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
      if (previousUpdateHeight) {
        root.style.setProperty("--pwa-update-height", previousUpdateHeight)
      } else {
        root.style.removeProperty("--pwa-update-height")
      }
      if (previousStickyNavigationHeight) {
        root.style.setProperty("--sticky-navigation-height", previousStickyNavigationHeight)
      } else {
        root.style.removeProperty("--sticky-navigation-height")
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
        "flex min-h-dvh flex-col bg-[#D7E2EF] text-slate-800 " +
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
        <VmaBanner {...vma} openMessage={openMessage} />
      </div>
      <Header reserveTopInset={!noticeVisible} />
      <BottomNavigation navigationRef={navigationRef} />
      <MobileMenu footerRef={mobileFooterRef} />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        aria-labelledby="page-heading"
        className={
          "mx-auto w-full max-w-4xl flex-1 scroll-mt-4 px-4 pt-8 pb-8 wrap-anywhere " +
          "sm:px-6 sm:pt-10"
        }
      >
        <div ref={updateRef} className="pwa-update-slot">
          <PwaUpdateNotice {...update} />
        </div>
        <InstallInstructions />
        <Outlet />
      </main>
      <Footer />
      {openedVma ? (
        <VmaMessageDialog
          key={openedVma.message.id}
          message={openedVma.message}
          currentMessage={
            // Prefer the deduplicated copy the banner lists, so a conflicting repeated CAP ID
            // cannot lend its validity to the opened headline.
            vma.activeMessages.find((message) => message.id === openedVma.message.id) ??
            vma.messages.find((message) => message.id === openedVma.message.id)
          }
          hasResult={vma.hasResult}
          status={vma}
          onClose={closeMessage}
        />
      ) : null}
    </div>
  )
}

export default AppLayout
