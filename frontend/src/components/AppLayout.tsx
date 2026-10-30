import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useVmaBanner } from "../hooks/useVmaBanner"
import { usePwaUpdate } from "../hooks/usePwaUpdate"
import BottomNavigation from "./BottomNavigation"
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
 * measured mobile menu button, VMA and app-update heights reserve scroll space around focused
 * content, and the button reserves none from 48rem upwards. VMA requests and the update
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
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
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
    const menuTrigger = menuTriggerRef.current
    const banner = bannerRef.current
    const updateNotice = updateRef.current
    if (!main || !navigation || !menuTrigger || !banner || !updateNotice) return

    const root = document.documentElement
    const previousHeight = root.style.getPropertyValue("--navigation-height")
    const previousBannerHeight = root.style.getPropertyValue("--vma-banner-height")
    const previousUpdateHeight = root.style.getPropertyValue("--pwa-update-height")
    let focusFrame = 0
    let measurementFrame = 0

    // The menu button is fixed below 48rem and display: none from there upwards.
    const menuTriggerVisible = () => getComputedStyle(menuTrigger).display !== "none"

    const keepFocusedContentVisible = () => {
      const focused = document.activeElement

      // Don't scroll based on the bounds of the entire main content area.
      if (focused === main) return

      const stickyUpdate = getComputedStyle(updateNotice).position === "sticky"
      if (
        !(focused instanceof HTMLElement) ||
        banner.contains(focused) ||
        (stickyUpdate && updateNotice.contains(focused)) ||
        (!main.contains(focused) && !navigation.contains(focused))
      )
        return

      const bannerBottom = banner.getBoundingClientRect().bottom
      const updateBounds = updateNotice.getBoundingClientRect()
      const updateBottom = stickyUpdate && updateBounds.height > 0 ? updateBounds.bottom : 0
      const visibleTop = Math.max(bannerBottom, updateBottom) + 8
      const visibleBottom = menuTriggerVisible()
        ? menuTrigger.getBoundingClientRect().top - 8
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
      // Measuring from the viewport bottom includes the button's safe-area offset and gap.
      const height = menuTriggerVisible()
        ? Math.max(0, Math.ceil(window.innerHeight - menuTrigger.getBoundingClientRect().top))
        : 0

      root.style.setProperty("--navigation-height", `${height}px`)
      root.style.setProperty(
        "--vma-banner-height",
        `${Math.ceil(banner.getBoundingClientRect().height)}px`
      )
      const updateHeight =
        getComputedStyle(updateNotice).position === "sticky"
          ? Math.ceil(updateNotice.getBoundingClientRect().height)
          : 0
      root.style.setProperty("--pwa-update-height", `${updateHeight}px`)
      scheduleFocusCheck()
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(measurementFrame)
      // Changing placement during resize delivery can resize the observed bar again.
      measurementFrame = requestAnimationFrame(updateReservedSpace)
    })
    observer.observe(menuTrigger)
    observer.observe(banner)
    observer.observe(updateNotice)
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
      <div ref={bannerRef} className="sticky top-0 z-30">
        <VmaBanner {...vma} openMessage={openMessage} />
      </div>
      <Header reserveTopInset={!noticeVisible} />
      <BottomNavigation navigationRef={navigationRef} />
      <MobileMenu triggerRef={menuTriggerRef} />
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
        <div ref={updateRef} className="pwa-update-slot">
          <PwaUpdateNotice {...update} />
        </div>
        <InstallInstructions />
        <Outlet />
      </main>
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
