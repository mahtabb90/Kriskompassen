import { vi } from "vitest"

/**
 * Supplies only native open/close methods missing in jsdom; browser behavior stays a manual check.
 *
 * Does not simulate keyboard containment, inertness or native focus restoration. Test callbacks
 * receive close events so application state and explicit focus restoration can be exercised.
 *
 * @returns Cleanup restoring the original prototype descriptors.
 */
export function installDialogTestMethods() {
  const prototype = HTMLDialogElement.prototype
  const showModal = Object.getOwnPropertyDescriptor(prototype, "showModal")
  const close = Object.getOwnPropertyDescriptor(prototype, "close")
  Object.defineProperty(prototype, "showModal", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "")
    }),
  })
  Object.defineProperty(prototype, "close", {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      if (!this.open) return
      this.removeAttribute("open")
      this.dispatchEvent(new Event("close"))
    }),
  })
  return () => {
    if (showModal) Object.defineProperty(prototype, "showModal", showModal)
    else Reflect.deleteProperty(prototype, "showModal")
    if (close) Object.defineProperty(prototype, "close", close)
    else Reflect.deleteProperty(prototype, "close")
  }
}
