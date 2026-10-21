import { useId, useLayoutEffect, useRef } from "react"
import type { SavedAddress } from "../types/address"
import { describeAddressLabel } from "../utils/addressLabel"

interface RemoveAddressDialogProps {
  address: SavedAddress
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirms address removal before it happens, modeled on VmaMessageDialog's native
 * <dialog> pattern (scroll lock, heading focus, Tab containment, close-event callback).
 *
 * The close event alone can't tell confirm apart from Escape/cancel, so outcomeRef
 * records which button (if any) triggered the close before it's read in the handler.
 */
function RemoveAddressDialog({ address, onCancel, onConfirm }: RemoveAddressDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const outcomeRef = useRef<"cancel" | "confirm">("cancel")
  const headingId = useId()

  useLayoutEffect(() => {
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
      restoreScroll()
      if (outcomeRef.current === "confirm") onConfirm()
      else onCancel()
    }
    dialog.addEventListener("close", handleClose)
    dialog.showModal()
    rootStyle.setProperty("overflow", "hidden")
    bodyStyle.setProperty("overflow", "hidden")
    headingRef.current?.focus({ preventScroll: true })

    return () => {
      dialog.removeEventListener("close", handleClose)
      if (dialog.open) dialog.close()
      restoreScroll()
    }
  }, [onCancel, onConfirm])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])")
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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-blue-200 bg-white p-0 text-slate-800 shadow-sm backdrop:bg-slate-950/60"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="text-xl leading-snug font-bold text-blue-900"
        >
          Ta bort adress?
        </h2>
        <p className="text-base text-slate-900">
          Vill du ta bort adressen <strong>{describeAddressLabel(address.label)}</strong>,{" "}
          {address.text}? Detta går inte att ångra.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              outcomeRef.current = "cancel"
              dialogRef.current?.close()
            }}
            className="min-h-12 min-w-12 rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => {
              outcomeRef.current = "confirm"
              dialogRef.current?.close()
            }}
            className="min-h-12 min-w-12 rounded-xl border-2 border-red-800 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
          >
            Ta bort
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default RemoveAddressDialog
