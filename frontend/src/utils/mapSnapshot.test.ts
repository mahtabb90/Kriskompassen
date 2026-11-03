// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  captureMapSnapshot,
  coverSourceRect,
  MAP_SNAPSHOT_HEIGHT,
  MAP_SNAPSHOT_WIDTH,
} from "./mapSnapshot"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("coverSourceRect", () => {
  it("crops the sides when the source is relatively wider than the destination", () => {
    // 780x256 (≈3.05:1) into 480x320 (1.5:1) - ShelterLocationMap's actual live shape.
    const rect = coverSourceRect(780, 256, 480, 320)

    expect(rect.sh).toBe(256)
    expect(rect.sw).toBeCloseTo(384, 5)
    expect(rect.sy).toBe(0)
    expect(rect.sx).toBeCloseTo((780 - 384) / 2, 5)
  })

  it("crops the top/bottom when the source is relatively taller than the destination", () => {
    const rect = coverSourceRect(480, 480, 480, 320)

    expect(rect.sw).toBe(480)
    expect(rect.sh).toBeCloseTo(320, 5)
    expect(rect.sx).toBe(0)
    expect(rect.sy).toBeCloseTo((480 - 320) / 2, 5)
  })

  it("crops nothing when the source already matches the destination's aspect ratio", () => {
    const rect = coverSourceRect(960, 640, 480, 320)

    expect(rect).toEqual({ sx: 0, sy: 0, sw: 960, sh: 640 })
  })
})

describe("captureMapSnapshot", () => {
  it("draws a centered, aspect-ratio-preserving crop of the source into the fixed-size offscreen canvas", async () => {
    const source = document.createElement("canvas")
    source.width = 780
    source.height = 256
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/jpeg" })
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback
    ) {
      callback(fakeBlob)
    })

    const result = await captureMapSnapshot(source)

    const expectedRect = coverSourceRect(780, 256, MAP_SNAPSHOT_WIDTH, MAP_SNAPSHOT_HEIGHT)
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(
      source,
      expectedRect.sx,
      expectedRect.sy,
      expectedRect.sw,
      expectedRect.sh,
      0,
      0,
      MAP_SNAPSHOT_WIDTH,
      MAP_SNAPSHOT_HEIGHT
    )
    expect(result).toBe(fakeBlob)
  })

  it("resolves null when a 2d context can't be obtained", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)

    const result = await captureMapSnapshot(document.createElement("canvas"))

    expect(result).toBeNull()
  })
})
