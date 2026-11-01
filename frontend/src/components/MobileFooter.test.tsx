// @vitest-environment jsdom
import { createRef } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import MobileFooter from "./MobileFooter"

function mountFooter(expanded = false) {
  const footerRef = createRef<HTMLElement>()
  const triggerRef = createRef<HTMLButtonElement>()
  const onOpen = vi.fn()
  const renderFooter = (isExpanded: boolean) => (
    <MobileFooter
      footerRef={footerRef}
      triggerRef={triggerRef}
      menuId="menu-dialog"
      expanded={isExpanded}
      onOpen={onOpen}
    />
  )
  const view = render(renderFooter(expanded))
  return {
    ...view,
    footerRef,
    triggerRef,
    onOpen,
    setExpanded: (isExpanded: boolean) => view.rerender(renderFooter(isExpanded)),
  }
}

afterEach(() => {
  cleanup()
})

describe("MobileFooter", () => {
  it("renders a named navigation landmark holding only the menu button", () => {
    const { footerRef, triggerRef } = mountFooter()
    const footer = screen.getByRole("navigation", { name: "Huvudmeny" })
    expect(footerRef.current).toBe(footer)
    expect(within(footer).getAllByRole("button")).toEqual([triggerRef.current])
    expect(within(footer).queryAllByRole("link")).toHaveLength(0)
  })

  it("points aria-controls at the menu and reflects its state in aria-expanded", () => {
    const { setExpanded } = mountFooter()
    const trigger = screen.getByRole("button", { name: "Meny" })
    expect(trigger.getAttribute("aria-controls")).toBe("menu-dialog")
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    setExpanded(true)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
  })

  it("requests opening when the button is selected", () => {
    const { onOpen } = mountFooter()
    fireEvent.click(screen.getByRole("button", { name: "Meny" }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("keeps the icon decorative, so the visible label names the button", () => {
    mountFooter()
    const trigger = screen.getByRole("button", { name: "Meny" })
    const icon = trigger.querySelector("svg")
    expect(icon?.getAttribute("aria-hidden")).toBe("true")
    expect(icon?.getAttribute("focusable")).toBe("false")
    expect(trigger.hasAttribute("aria-label")).toBe(false)
  })
})
