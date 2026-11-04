// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { getByRole, getByText } from "@testing-library/dom"
import type { Map as MapLibreMap, Popup } from "maplibre-gl"
import type { Shelter } from "../types/shelter"
import { buildPopupContent, observePopupLayout } from "./shelterMapPopup"

// MapLibre itself needs a real WebGL canvas and can't run under jsdom, so the map component as
// a whole (AllSheltersMap.tsx) is only exercised manually (see AGENTS.md's PR checklist) or,
// one level up, via a stubbed AllSheltersMap in ShelterMapPage.test.tsx. buildPopupContent lives
// in its own module specifically so its plain-DOM popup output - including the save/remove
// button added by this change - can still be tested directly, without needing a real map
// instance and without breaking AllSheltersMap.tsx's Fast Refresh contract (a component file may
// only export the component itself).

function makeShelter(overrides: Partial<Shelter> = {}): Shelter {
  return {
    id: "shelter-1",
    number: "120599-3",
    address: "Lantmätaren 2",
    lat: 59.33,
    lon: 18.07,
    capacity: 120,
    type: "Skyddsrum",
    ...overrides,
  }
}

function saveToggleButton(entry: Element): HTMLButtonElement {
  const button = entry.querySelector("button")
  if (!button) throw new Error("save/remove button not found in popup entry")
  return button
}

function expectAction(entry: Element, name: string) {
  expect(getByRole(entry as HTMLElement, "button", { name })).toBe(saveToggleButton(entry))
}

function expectStatus(entry: Element, text: string) {
  expect(getByText(entry as HTMLElement, text, { ignore: '[aria-hidden="true"]' })).toBeTruthy()
}

describe("buildPopupContent", () => {
  it("shows the unsaved label and status for a shelter that isn't saved", () => {
    const shelter = makeShelter()
    const content = buildPopupContent(
      [shelter],
      null,
      new Map(),
      vi.fn(),
      () => false,
      vi.fn(),
      vi.fn()
    )

    const entry = content.children[0]
    expectAction(entry, "Spara skyddsrum")
    expectStatus(entry, "Inte sparat")
    expect(content.getAttribute("role")).toBe("region")
    expect(content.getAttribute("aria-label")).toBe("Skyddsrum vid vald plats")
    expect(content.tabIndex).toBe(0)
  })

  it("shows the saved label and status for a shelter that is already saved", () => {
    const shelter = makeShelter()
    const content = buildPopupContent(
      [shelter],
      null,
      new Map(),
      vi.fn(),
      () => true,
      vi.fn(),
      vi.fn()
    )

    const entry = content.children[0]
    expectAction(entry, "Ta bort sparat skyddsrum")
    expectStatus(entry, "Sparat skyddsrum")
  })

  it("meets the 48x48px minimum touch target (DESIGN_SYSTEM.md §6.1)", () => {
    const content = buildPopupContent(
      [makeShelter()],
      null,
      new Map(),
      vi.fn(),
      () => false,
      vi.fn(),
      vi.fn()
    )

    const button = saveToggleButton(content.children[0])
    expect(button.className).toContain("min-h-12")
    expect(button.className).toContain("min-w-12")
  })

  it("calls save() with the shelter when clicked while unsaved, then flips to the saved label", async () => {
    const shelter = makeShelter()
    const save = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)
    const content = buildPopupContent(
      [shelter],
      null,
      new Map(),
      vi.fn(),
      () => false,
      save,
      remove
    )

    const entry = content.children[0]
    const button = saveToggleButton(entry)
    button.click()

    expect(save).toHaveBeenCalledWith(shelter)
    expect(remove).not.toHaveBeenCalled()

    // save() resolves asynchronously - the button flips its own label once it does, without
    // the popup being torn down and rebuilt (there is no React re-render backing this DOM).
    await Promise.resolve()
    await Promise.resolve()

    expectAction(entry, "Ta bort sparat skyddsrum")
    expectStatus(entry, "Sparat skyddsrum")
    expect(saveToggleButton(entry)).toBe(button)
  })

  it("calls remove() with the shelter's id when clicked while saved, then flips to the unsaved label", async () => {
    const shelter = makeShelter()
    const save = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)
    const content = buildPopupContent([shelter], null, new Map(), vi.fn(), () => true, save, remove)

    const entry = content.children[0]
    const button = saveToggleButton(entry)
    button.click()

    expect(remove).toHaveBeenCalledWith(shelter.id)
    expect(save).not.toHaveBeenCalled()

    await Promise.resolve()
    await Promise.resolve()

    expectAction(entry, "Spara skyddsrum")
    expectStatus(entry, "Inte sparat")
    expect(saveToggleButton(entry)).toBe(button)
  })

  it("gives every shelter in a multi-shelter popup its own independent save/remove control", async () => {
    const savedShelter = makeShelter({ id: "saved-1" })
    const unsavedShelter = makeShelter({ id: "unsaved-1" })
    const save = vi.fn().mockResolvedValue(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)
    const isSaved = (id: string) => id === savedShelter.id

    const content = buildPopupContent(
      [savedShelter, unsavedShelter],
      null,
      new Map(),
      vi.fn(),
      isSaved,
      save,
      remove
    )

    expect(content.children.length).toBe(2)
    const [savedEntry, unsavedEntry] = Array.from(content.children)
    expectAction(savedEntry, "Ta bort sparat skyddsrum")
    expectAction(unsavedEntry, "Spara skyddsrum")

    // Toggling the first entry must not affect the second one's label or trigger its callback.
    saveToggleButton(savedEntry).click()
    await Promise.resolve()
    await Promise.resolve()

    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(savedShelter.id)
    expectAction(savedEntry, "Spara skyddsrum")
    expectAction(unsavedEntry, "Spara skyddsrum")
  })

  it.each([false, true])("keeps a working detail link before the toggle when saved=%s", (saved) => {
    const onNavigate = vi.fn()
    const shelter = makeShelter()
    const content = buildPopupContent(
      [shelter],
      null,
      new Map(),
      onNavigate,
      () => saved,
      vi.fn(),
      vi.fn()
    )

    const entry = content.children[0]
    const link = entry.querySelector("a")
    expect(link).not.toBeNull()
    expect(link?.getAttribute("href")).toBe(`/skyddsrum/${shelter.id}`)
    expect(
      link!.compareDocumentPosition(saveToggleButton(entry)) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    expect(onNavigate).toHaveBeenCalledWith(`/skyddsrum/${shelter.id}`)
  })
})

describe("observePopupLayout", () => {
  afterEach(() => vi.unstubAllGlobals())

  function setup() {
    const geometry = { width: 320, height: 400, contentHeight: 600 }
    const mapElement = document.createElement("div")
    const popupElement = document.createElement("div")
    const content = document.createElement("div")
    content.appendChild(document.createElement("div"))
    popupElement.appendChild(content)
    let open = true
    let resize = () => {}
    let move = () => {}
    let close = () => {}
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe = observe
        disconnect = disconnect
      }
    )

    Object.defineProperties(mapElement, {
      clientWidth: { get: () => geometry.width },
      clientHeight: { get: () => geometry.height },
    })
    Object.defineProperty(content, "offsetHeight", {
      get: () => Math.min(geometry.contentHeight, parseFloat(content.style.maxHeight) || Infinity),
    })
    Object.defineProperty(popupElement, "offsetHeight", {
      get: () => content.offsetHeight + 30,
    })
    mapElement.getBoundingClientRect = () => new DOMRect(20, 40, geometry.width, geometry.height)
    popupElement.getBoundingClientRect = () => {
      const [x = 0, y = 0] = popupElement.style.translate
        .split(" ")
        .map((value) => parseFloat(value))
      return new DOMRect(
        -50 + (x || 0),
        -250 + (y || 0),
        Math.min(280, geometry.width - 32),
        popupElement.offsetHeight
      )
    }
    const map = {
      getContainer: () => mapElement,
      resize: vi.fn(),
      on: vi.fn((_event: string, callback: () => void) => {
        move = callback
      }),
      off: vi.fn(),
    }
    let maxWidth = "240px"
    const popup = {
      getElement: () => popupElement,
      getMaxWidth: () => maxWidth,
      setMaxWidth: vi.fn((value: string) => {
        maxWidth = value
      }),
      isOpen: () => open,
      getLngLat: () => ({ lng: 18.07, lat: 59.33 }),
      setLngLat: vi.fn(),
      once: vi.fn((_event: string, callback: () => void) => {
        close = callback
      }),
    }
    observePopupLayout(map as unknown as MapLibreMap, popup as unknown as Popup, content)
    return {
      geometry,
      map,
      popup,
      content,
      mapElement,
      popupElement,
      observe,
      disconnect,
      resize: () => resize(),
      move: () => move(),
      close: () => {
        open = false
        close()
      },
    }
  }

  it("caps long content and keeps the popup inside the map without panning it", () => {
    const { content, popupElement, mapElement, map, popup } = setup()
    const bounds = popupElement.getBoundingClientRect()
    const mapBounds = mapElement.getBoundingClientRect()

    expect(content.style.maxHeight).toBe("338px")
    expect(popup.setMaxWidth).toHaveBeenCalledWith("min(24rem, 288px)")
    expect(bounds.left).toBeGreaterThanOrEqual(mapBounds.left + 16)
    expect(bounds.top).toBeGreaterThanOrEqual(mapBounds.top + 16)
    expect(bounds.right).toBeLessThanOrEqual(mapBounds.right - 16)
    expect(bounds.bottom).toBeLessThanOrEqual(mapBounds.bottom - 16)
    expect(map.resize).not.toHaveBeenCalled()
  })

  it("recalculates after content or map resizing and map movement", () => {
    const test = setup()
    test.geometry.width = 220
    test.geometry.height = 500
    test.geometry.contentHeight = 1200
    test.resize()
    test.move()

    expect(test.content.style.maxHeight).toBe("438px")
    expect(test.popup.setMaxWidth).toHaveBeenLastCalledWith("min(24rem, 188px)")
    expect(test.observe).toHaveBeenCalledWith(test.content.firstElementChild)
    expect(test.map.resize).toHaveBeenCalledOnce()
    const bounds = test.popupElement.getBoundingClientRect()
    expect(bounds.top).toBeGreaterThanOrEqual(56)
    expect(bounds.bottom).toBeLessThanOrEqual(524)
    expect(bounds.right).toBeLessThanOrEqual(224)
  })

  it("disconnects on close and ignores a late observer callback", () => {
    const test = setup()
    const callback = test.map.on.mock.calls[0][1]
    test.close()
    test.resize()

    expect(test.disconnect).toHaveBeenCalledOnce()
    expect(test.map.off).toHaveBeenCalledWith("move", callback)
    expect(test.map.resize).not.toHaveBeenCalled()
  })
})
