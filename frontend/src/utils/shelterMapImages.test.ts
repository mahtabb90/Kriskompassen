// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  SHELTER_ICON_IDS,
  registerShelterIcons,
  shelterIconIdFor,
  svgForVariant,
} from "./shelterMapImages"

// jsdom has no real canvas/image decoding, so these stub just enough of the browser APIs
// rasterizeShelterIcon() depends on (a fake Image that "decodes" instantly, and a fake 2D
// canvas context) for it to run for real without crashing - rather than mocking a sibling
// export of the same module, which an ES module's live bindings would make ineffective.
class FakeImage {
  decode = vi.fn().mockResolvedValue(undefined)
  src = ""
  width: number | undefined
  height: number | undefined
  constructor(width?: number, height?: number) {
    this.width = width
    this.height = height
  }
}

const originalCreateElement = document.createElement.bind(document)

beforeEach(() => {
  vi.stubGlobal("Image", FakeImage)
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName !== "canvas") return originalCreateElement(tagName)
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => ({ width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4) }),
      }),
    } as unknown as HTMLCanvasElement
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("shelterIconIdFor", () => {
  it("returns the default icon when neither nearest nor saved", () => {
    expect(shelterIconIdFor(false, false)).toBe(SHELTER_ICON_IDS.default)
  })

  it("returns the nearest icon when only nearest", () => {
    expect(shelterIconIdFor(true, false)).toBe(SHELTER_ICON_IDS.nearest)
  })

  it("returns the saved icon when only saved", () => {
    expect(shelterIconIdFor(false, true)).toBe(SHELTER_ICON_IDS.saved)
  })

  it("returns the combined icon when both nearest and saved", () => {
    expect(shelterIconIdFor(true, true)).toBe(SHELTER_ICON_IDS["nearest-saved"])
  })
})

describe("svgForVariant", () => {
  it("builds markup for every variant without throwing", () => {
    for (const variant of Object.keys(SHELTER_ICON_IDS) as (keyof typeof SHELTER_ICON_IDS)[]) {
      expect(svgForVariant(variant)).toContain("<svg")
    }
  })
})

function fakeMap(hasImage: (id: string) => boolean) {
  return {
    hasImage: vi.fn(hasImage),
    addImage: vi.fn(),
  } as unknown as import("maplibre-gl").Map
}

describe("registerShelterIcons", () => {
  it("registers all four icon variants exactly once each", async () => {
    const map = fakeMap(() => false)

    await registerShelterIcons(map)

    expect(map.addImage).toHaveBeenCalledTimes(4)
    const registeredIds = vi.mocked(map.addImage).mock.calls.map(([id]) => id)
    expect(new Set(registeredIds)).toEqual(new Set(Object.values(SHELTER_ICON_IDS)))
  })

  it("skips an icon already registered on the map", async () => {
    const map = fakeMap((id) => id === SHELTER_ICON_IDS.default)

    await registerShelterIcons(map)

    expect(map.addImage).toHaveBeenCalledTimes(3)
    expect(vi.mocked(map.addImage).mock.calls.map(([id]) => id)).not.toContain(
      SHELTER_ICON_IDS.default
    )
  })
})
