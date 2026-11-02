import { afterEach, describe, expect, it, vi } from "vitest"
import { krisinfoSections, type KrisinfoSectionId } from "../content/krisinfo/index"
import { getKrisinfoSection, KrisinfoError } from "./krisinfoService"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("getKrisinfoSection", () => {
  it.each(Object.keys(krisinfoSections) as KrisinfoSectionId[])(
    "returns the bundled %s section",
    async (sectionId) => {
      await expect(getKrisinfoSection(sectionId)).resolves.toBe(krisinfoSections[sectionId])
    }
  )

  it("resolves asynchronously, like a future storage or network source", () => {
    const result = getKrisinfoSection("phone-numbers")
    expect(result).toBeInstanceOf(Promise)
  })

  it("performs no network request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await getKrisinfoSection("warning-signals")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects an already aborted read without returning content", async () => {
    const controller = new AbortController()
    controller.abort()
    const read = getKrisinfoSection("phone-numbers", controller.signal)
    await expect(read).rejects.toBeInstanceOf(KrisinfoError)
    await expect(read).rejects.toMatchObject({ code: "aborted" })
  })

  it("resolves while the signal is still active", async () => {
    const controller = new AbortController()
    await expect(getKrisinfoSection("phone-numbers", controller.signal)).resolves.toBe(
      krisinfoSections["phone-numbers"]
    )
  })

  it.each(["unknown", "toString", "__proto__"])(
    "rejects the unknown section id %s instead of resolving undefined",
    async (sectionId) => {
      await expect(getKrisinfoSection(sectionId as KrisinfoSectionId)).rejects.toMatchObject({
        name: "KrisinfoError",
        code: "unknown_section",
      })
    }
  )
})
