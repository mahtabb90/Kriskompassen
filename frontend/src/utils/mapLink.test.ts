import { describe, expect, it } from "vitest"
import { buildOpenStreetMapUrl } from "./mapLink"

describe("buildOpenStreetMapUrl", () => {
  it("builds a street-level OpenStreetMap link for the given coordinate", () => {
    expect(buildOpenStreetMapUrl({ lat: 59.352, lon: 18.152 })).toBe(
      "https://www.openstreetmap.org/?mlat=59.352&mlon=18.152#map=18/59.352/18.152"
    )
  })
})
