// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import type { Shelter } from "../types/shelter"
import { buildPopupContent } from "./shelterMapPopup"

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
    const button = saveToggleButton(entry)
    expect(button.textContent).toBe("Spara skyddsrum")
    expect(entry.textContent).toContain("Inte sparat")
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
    const button = saveToggleButton(entry)
    expect(button.textContent).toBe("Ta bort sparat skyddsrum")
    expect(entry.textContent).toContain("Sparat skyddsrum")
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

    expect(button.textContent).toBe("Ta bort sparat skyddsrum")
    expect(entry.textContent).toContain("Sparat skyddsrum")
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

    expect(button.textContent).toBe("Spara skyddsrum")
    expect(entry.textContent).toContain("Inte sparat")
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
    expect(saveToggleButton(savedEntry).textContent).toBe("Ta bort sparat skyddsrum")
    expect(saveToggleButton(unsavedEntry).textContent).toBe("Spara skyddsrum")

    // Toggling the first entry must not affect the second one's label or trigger its callback.
    saveToggleButton(savedEntry).click()
    await Promise.resolve()
    await Promise.resolve()

    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(savedShelter.id)
    expect(saveToggleButton(savedEntry).textContent).toBe("Spara skyddsrum")
    expect(saveToggleButton(unsavedEntry).textContent).toBe("Spara skyddsrum")
  })

  it("still renders a working 'Visa detaljer' link alongside the save/remove button", () => {
    const onNavigate = vi.fn()
    const shelter = makeShelter()
    const content = buildPopupContent(
      [shelter],
      null,
      new Map(),
      onNavigate,
      () => false,
      vi.fn(),
      vi.fn()
    )

    const entry = content.children[0]
    const link = entry.querySelector("a")
    expect(link).not.toBeNull()
    expect(link?.getAttribute("href")).toBe(`/skyddsrum/${shelter.id}`)

    link?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    expect(onNavigate).toHaveBeenCalledWith(`/skyddsrum/${shelter.id}`)
  })
})
