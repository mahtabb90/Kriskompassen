// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SavedAddress } from "../types/address"
import { installDialogTestMethods } from "./__fixtures__/dialog"
import RemoveAddressDialog from "./RemoveAddressDialog"

const address: SavedAddress = {
  id: "1",
  text: "Hemgatan 1",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-13T00:00:00.000Z",
}

let restoreDialog: () => void

beforeEach(() => {
  restoreDialog = installDialogTestMethods()
})

afterEach(() => {
  cleanup()
  restoreDialog()
  document.documentElement.style.removeProperty("overflow")
  document.body.style.removeProperty("overflow")
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("RemoveAddressDialog", () => {
  it("focuses the heading and names the address to remove", () => {
    render(<RemoveAddressDialog address={address} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    const dialog = screen.getByRole("dialog")
    expect(document.activeElement).toBe(
      within(dialog).getByRole("heading", { name: "Ta bort adress?" })
    )
    expect(dialog.textContent).toContain("Hem")
    expect(dialog.textContent).toContain("Hemgatan 1")
  })

  it("wraps Tab and Shift+Tab between the cancel and confirm buttons", () => {
    render(<RemoveAddressDialog address={address} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    const dialog = screen.getByRole("dialog")
    const first = within(dialog).getByRole("button", { name: "Avbryt" })
    const last = within(dialog).getByRole("button", { name: "Ta bort" })

    last.focus()
    fireEvent.keyDown(last, { key: "Tab" })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it("calls onCancel and not onConfirm when Avbryt is clicked", () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<RemoveAddressDialog address={address} onCancel={onCancel} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("calls onConfirm and not onCancel when Ta bort is clicked", () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<RemoveAddressDialog address={address} onCancel={onCancel} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: "Ta bort" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("treats an unprompted close (e.g. Escape) as a cancel", () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<RemoveAddressDialog address={address} onCancel={onCancel} onConfirm={onConfirm} />)
    const dialog = screen.getByRole<HTMLDialogElement>("dialog")

    dialog.close()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("locks scroll while open and restores it on close", () => {
    document.documentElement.style.overflow = "auto"
    document.body.style.setProperty("overflow", "scroll")
    const onCancel = vi.fn()
    render(<RemoveAddressDialog address={address} onCancel={onCancel} onConfirm={vi.fn()} />)

    expect(document.body.style.overflow).toBe("hidden")

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }))

    expect(document.documentElement.style.getPropertyValue("overflow")).toBe("auto")
    expect(document.body.style.overflow).toBe("scroll")
  })

  it("releases an open dialog and its scroll lock on unmount", () => {
    const onCancel = vi.fn()
    const { unmount } = render(
      <RemoveAddressDialog address={address} onCancel={onCancel} onConfirm={vi.fn()} />
    )
    const dialog = screen.getByRole<HTMLDialogElement>("dialog")

    unmount()

    expect(dialog.open).toBe(false)
    expect(document.body.style.overflow).toBe("")
    expect(onCancel).not.toHaveBeenCalled()
  })
})
