// @vitest-environment jsdom
import { createRef } from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import BottomNavigation from "./BottomNavigation"

let fixed = true
let reducedMotion = false
const resizeObservers: Array<{ measure: () => void; disconnect: ReturnType<typeof vi.fn> }> = []
const scrollBy = vi.fn()

beforeEach(() => {
  fixed = true
  reducedMotion = false
  const originalStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = originalStyle(element)
    if (element.tagName !== "NAV") return style
    style.setProperty(
      "position",
      fixed && !element.hasAttribute("data-overflows-viewport") ? "fixed" : "static"
    )
    return style
  })
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = vi.fn()
      constructor(measure: () => void) {
        resizeObservers.push({ measure, disconnect: this.disconnect })
      }
      observe() {}
    }
  )
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }))
  scrollBy.mockReset()
})

afterEach(() => {
  cleanup()
  resizeObservers.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function mountNavigation(initialPath = "/") {
  const navigationRef = createRef<HTMLElement>()
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNavigation navigationRef={navigationRef} />
    </MemoryRouter>
  )
  const navigation = screen.getByRole("navigation", { name: "Huvudnavigation" })
  const list = screen.getByRole("list")
  const shell = list.parentElement!
  shell.style.paddingLeft = "8px"
  shell.style.paddingRight = "8px"
  Object.defineProperties(shell, {
    clientWidth: { configurable: true, value: 320 },
  })
  Object.defineProperties(list, {
    clientWidth: { configurable: true, value: 200 },
    scrollWidth: { configurable: true, value: 640 },
    scrollLeft: { configurable: true, writable: true, value: 0 },
    scrollBy: { configurable: true, value: scrollBy },
  })
  vi.spyOn(list, "getBoundingClientRect").mockReturnValue(new DOMRect(60, 500, 200, 64))
  const links = screen.getAllByRole("link")
  for (const [index, bounds] of [
    new DOMRect(68, 508, 52, 48),
    new DOMRect(128, 508, 136, 48),
    new DOMRect(272, 508, 110, 48),
    new DOMRect(390, 508, 100, 48),
    new DOMRect(498, 508, 78, 48),
  ].entries()) {
    vi.spyOn(links[index], "getBoundingClientRect").mockReturnValue(bounds)
  }
  act(() => resizeObservers[0].measure())
  return { navigation, list, shell }
}

describe("BottomNavigation horizontal scrolling", () => {
  it("keeps full labels and all routes in one shared list", () => {
    mountNavigation()
    expect(screen.getAllByRole("navigation")).toHaveLength(1)
    expect(screen.getAllByRole("list")).toHaveLength(1)
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/crisis",
      "/crisis-kit",
      "/skyddsrum",
      "/min-info",
    ])
    expect(screen.getByRole("link", { name: "Krisinformation" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Hem" }).getAttribute("aria-current")).toBe("page")
  })

  it("shows available directions and keeps button focus when the end is reached", () => {
    const { list } = mountNavigation()
    const left = screen.getByRole("button", { name: "Rulla menyn åt vänster" })
    const right = screen.getByRole("button", { name: "Rulla menyn åt höger" })
    expect(left.getAttribute("aria-disabled")).toBe("true")
    expect(left.tabIndex).toBe(-1)
    expect(right.getAttribute("aria-disabled")).toBe("false")
    expect(right.getAttribute("aria-controls")).toBe(list.id)
    fireEvent.click(left)
    expect(scrollBy).not.toHaveBeenCalled()
    right.focus()
    fireEvent.click(right)
    expect(scrollBy).toHaveBeenCalledWith({ left: 160, behavior: "smooth" })

    list.scrollLeft = 440
    fireEvent.scroll(list)
    expect(right.getAttribute("aria-disabled")).toBe("true")
    expect(document.activeElement).toBe(right)
    expect(left.getAttribute("aria-disabled")).toBe("false")
    scrollBy.mockClear()
    fireEvent.click(right)
    expect(scrollBy).not.toHaveBeenCalled()
    fireEvent.click(left)
    expect(scrollBy).toHaveBeenCalledWith({ left: -160, behavior: "smooth" })
  })

  it("updates arrows after swiping, including fractional positions at an edge", () => {
    const { list } = mountNavigation()
    list.scrollLeft = 150
    fireEvent.scroll(list)
    expect(
      screen
        .getAllByRole("button")
        .every((button) => button.getAttribute("aria-disabled") === "false")
    ).toBe(true)
    list.scrollLeft = 439.5
    fireEvent.scroll(list)
    expect(
      screen.getByRole("button", { name: "Rulla menyn åt höger" }).getAttribute("aria-disabled")
    ).toBe("true")
  })

  it("scrolls immediately when reduced motion is requested", () => {
    reducedMotion = true
    mountNavigation()
    fireEvent.click(screen.getByRole("button", { name: "Rulla menyn åt höger" }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 160, behavior: "instant" })
  })

  it("reveals a focused link with space for its outline", () => {
    mountNavigation()
    act(() => screen.getByRole("link", { name: "Min info" }).focus())
    expect(scrollBy).toHaveBeenCalledWith({ left: 324, behavior: "instant" })
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Min info" }))
  })

  it("preserves pointer selection before revealing the selected route", () => {
    mountNavigation()
    const link = screen.getByRole("link", { name: "Min info" })
    fireEvent.pointerDown(link)
    act(() => link.focus())
    expect(scrollBy).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(link.getAttribute("aria-current")).toBe("page")
    expect(scrollBy).toHaveBeenCalledWith({ left: 324, behavior: "instant" })
  })

  it("reveals focus after a canceled pointer gesture", () => {
    mountNavigation()
    const link = screen.getByRole("link", { name: "Min info" })
    fireEvent.pointerDown(link)
    fireEvent.pointerCancel(link)
    act(() => link.focus())
    expect(scrollBy).toHaveBeenCalledWith({ left: 324, behavior: "instant" })
  })

  it("reveals the current link on direct entry and route changes", () => {
    mountNavigation("/min-info")
    expect(scrollBy).toHaveBeenCalledWith({ left: 324, behavior: "instant" })
    cleanup()
    resizeObservers.length = 0
    scrollBy.mockClear()
    mountNavigation()
    fireEvent.click(screen.getByRole("link", { name: "Min info" }))
    expect(screen.getByRole("link", { name: "Min info" }).getAttribute("aria-current")).toBe("page")
    expect(scrollBy).toHaveBeenCalledWith({ left: 324, behavior: "instant" })
  })

  it("hides controls when everything fits and detects a longer menu on resize", () => {
    const { list, navigation } = mountNavigation()
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 280 })
    act(() => resizeObservers[0].measure())
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(navigation.hasAttribute("data-scrollable")).toBe(false)
    Object.defineProperty(list, "scrollWidth", { configurable: true, value: 1200 })
    act(() => resizeObservers[0].measure())
    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(navigation.hasAttribute("data-scrollable")).toBe(true)
  })

  it("does not expose controls or scroll links in desktop and normal-flow navigation", () => {
    fixed = false
    const { navigation } = mountNavigation("/min-info")
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(navigation.hasAttribute("data-scrollable")).toBe(false)
    expect(scrollBy).not.toHaveBeenCalled()
    act(() => screen.getByRole("link", { name: "Min info" }).focus())
    expect(scrollBy).not.toHaveBeenCalled()
  })

  it("returns focus to the current link when the layout disables the bottom bar", async () => {
    const { navigation } = mountNavigation()
    screen.getByRole("button", { name: "Rulla menyn åt höger" }).focus()
    navigation.setAttribute("data-overflows-viewport", "")
    await waitFor(() => expect(screen.queryAllByRole("button")).toHaveLength(0))
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Hem" }))
  })

  it("disconnects measurement observers and the resize listener on unmount", () => {
    const removeListener = vi.spyOn(window, "removeEventListener")
    const disconnectPlacement = vi.spyOn(MutationObserver.prototype, "disconnect")
    mountNavigation()
    cleanup()
    expect(resizeObservers[0].disconnect).toHaveBeenCalledOnce()
    expect(disconnectPlacement).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function))
  })
})
