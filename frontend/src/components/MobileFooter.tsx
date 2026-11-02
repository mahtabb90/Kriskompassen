import type { RefObject } from "react"

interface MobileFooterProps {
  footerRef: RefObject<HTMLElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
  menuId: string
  expanded: boolean
  onOpen: () => void
}

/**
 * Renders the fixed amber bottom bar as one full-width "Meny" button below 48rem.
 *
 * The bar is hidden from 48rem upwards. Its stacking order stays below the VMA and app-update
 * notices, and native modals sit above it in the top layer. Safe-area padding belongs to the
 * button so the full bar remains a touch target; the layout measures that padding with the bar.
 *
 * @param footerRef Gives the shared layout access to the bar to reserve scroll space for it.
 * @param triggerRef Gives the menu access to the button for returning focus.
 * @param menuId ID of the menu dialog that the button controls.
 * @param expanded Whether the menu dialog is open.
 * @param onOpen Called when the button is selected.
 */
function MobileFooter({ footerRef, triggerRef, menuId, expanded, onOpen }: MobileFooterProps) {
  return (
    <nav
      ref={footerRef}
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-5 border-t-2 border-blue-900 bg-amber-300 md:hidden"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onClick={onOpen}
        className={
          "mobile-menu-trigger flex min-h-12 min-w-12 w-full cursor-pointer items-center " +
          "justify-center gap-3 bg-amber-300 pt-3 text-base font-normal text-blue-900 " +
          "pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] " +
          "pl-[max(1rem,env(safe-area-inset-left))] " +
          "hover:bg-amber-200 active:bg-amber-400"
        }
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
          className="shrink-0"
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
    </nav>
  )
}

export default MobileFooter
