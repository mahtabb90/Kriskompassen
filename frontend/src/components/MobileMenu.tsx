import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { NavLink, useLocation } from "react-router-dom"
import InstallAppButton from "./InstallAppButton"
import { navigationItems } from "./navigationItems"

interface MobileMenuProps {
  triggerRef: RefObject<HTMLButtonElement | null>
}

/** Why the dialog closed, which decides whether focus returns to the trigger. */
type CloseReason = "manual" | "navigation" | "viewport"

/**
 * Provides the primary links below 48rem: a fixed, centred "Meny" button that opens a full-screen
 * native modal dialog.
 *
 * Native modal behaviour makes the page inert, lets Escape close the dialog and removes it from
 * keyboard and assistive technology while closed. Scroll is locked while open and the link list
 * scrolls internally. Closing by button or Escape, or selecting the current route, returns focus
 * to the trigger. Selecting another route leaves focus to AppLayout's route heading focus, and
 * crossing 48rem closes the menu without focusing the now hidden trigger. When the browser offers
 * installation, an install button sits right-aligned in a fixed footer below the scrolling links,
 * as the last control; selecting it closes the menu manually. The footer is hidden while empty.
 *
 * @param triggerRef Gives the shared layout access to the button to reserve scroll space for it.
 */
function MobileMenu({ triggerRef }: MobileMenuProps) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const closeReason = useRef<CloseReason>("manual")
  const previousPathname = useRef(pathname)
  const headingId = useId()
  const dialogId = useId()

  useLayoutEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const rootStyle = document.documentElement.style
    const bodyStyle = document.body.style
    const rootOverflow = rootStyle.getPropertyValue("overflow")
    const rootPriority = rootStyle.getPropertyPriority("overflow")
    const bodyOverflow = bodyStyle.getPropertyValue("overflow")
    const bodyPriority = bodyStyle.getPropertyPriority("overflow")
    const restoreScroll = () => {
      if (rootOverflow) rootStyle.setProperty("overflow", rootOverflow, rootPriority)
      else rootStyle.removeProperty("overflow")
      if (bodyOverflow) bodyStyle.setProperty("overflow", bodyOverflow, bodyPriority)
      else bodyStyle.removeProperty("overflow")
    }
    const handleClose = () => {
      if (dialog.open) return
      const reason = closeReason.current
      closeReason.current = "manual"
      restoreScroll()
      setOpen(false)
      if (reason === "manual") triggerRef.current?.focus()
      // The trigger is hidden at desktop width, so keyboard users continue at the page heading.
      else if (reason === "viewport") {
        document.getElementById("page-heading")?.focus({ preventScroll: true })
      }
    }
    const desktop = window.matchMedia("(min-width: 48rem)")
    const handleViewportChange = () => {
      if (!desktop.matches) return
      closeReason.current = "viewport"
      dialog.close()
    }
    dialog.addEventListener("close", handleClose)
    desktop.addEventListener("change", handleViewportChange)
    dialog.showModal()
    rootStyle.setProperty("overflow", "hidden")
    bodyStyle.setProperty("overflow", "hidden")
    headingRef.current?.focus({ preventScroll: true })

    return () => {
      dialog.removeEventListener("close", handleClose)
      desktop.removeEventListener("change", handleViewportChange)
      if (dialog.open) dialog.close()
      restoreScroll()
    }
  }, [open, triggerRef])

  useEffect(() => {
    if (previousPathname.current === pathname) return
    previousPathname.current = pathname
    // Browser history can change the route while the menu is open. A link selection has already
    // closed the dialog, so its recorded reason must not be overwritten.
    const dialog = dialogRef.current
    if (!dialog?.open) return
    closeReason.current = "navigation"
    dialog.close()
  }, [pathname])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={
          "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 " +
          "inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 " +
          "rounded-xl border-2 border-blue-900 bg-blue-900 px-5 py-3 font-semibold text-white " +
          "shadow-lg hover:bg-blue-950 md:hidden"
        }
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Meny
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={headingId}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href]"
          )
          const first = controls[0]
          const last = controls[controls.length - 1]
          // Native tabbing can otherwise leave the last control for browser chrome.
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        className={
          "mobile-menu-dialog bg-white p-0 text-slate-800 " +
          "pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] " +
          "pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop:bg-slate-950/60"
        }
      >
        <div className="mx-auto flex h-full max-w-4xl flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-blue-900"
            >
              Meny
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-12 min-w-12 cursor-pointer rounded-xl border-2 border-blue-900 bg-white px-4 py-2 font-semibold text-blue-900 hover:bg-blue-50"
            >
              Stäng menyn
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <ul className="space-y-2">
              {navigationItems.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => {
                      // Re-selecting the current route changes nothing for AppLayout to focus.
                      closeReason.current = pathname === to ? "manual" : "navigation"
                      dialogRef.current?.close()
                    }}
                    className={({ isActive }) =>
                      "flex min-h-12 items-center rounded-xl px-4 py-3 text-lg leading-normal wrap-anywhere " +
                      (isActive
                        ? "bg-blue-900 font-bold text-white underline decoration-2 underline-offset-4"
                        : "font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900")
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-3 empty:hidden">
            {/* Moving focus out of the open modal would escape its focus containment, so the
                menu closes and returns focus to the trigger like any manual close. */}
            <InstallAppButton afterPrompt={() => dialogRef.current?.close()} variant="text" />
          </div>
        </div>
      </dialog>
    </>
  )
}

export default MobileMenu
