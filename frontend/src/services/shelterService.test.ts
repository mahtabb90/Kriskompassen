import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { ShelterResponseValidationError } from "./shelterResponseValidator"
import { fetchNearestShelters, ShelterRequestError } from "./shelterService"

const validResponseBody = {
  shelters: [
    {
      id: "a0f314b8-0532-4783-a949-df9ff4a9d73d",
      number: "120599-3",
      address: "Kantarellen 11",
      lat: 59.352,
      lon: 18.152,
      capacity: 200,
      type: "Skyddsrum",
    },
  ],
  source: {
    name: "Myndigheten för civilt försvar (MCF)",
    url: "https://example.com/metadata",
    apiName: "MCF WFS (OGC API Features)",
    apiUrl: "https://inspire.mcf.se/skyddsrum/wfs",
  },
  bboxRadiusMetersUsed: 2000,
}

let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(validResponseBody))
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("fetchNearestShelters", () => {
  it("fetches without credentials or cache and returns the validated response", async () => {
    await expect(fetchNearestShelters(59.0, 18.0)).resolves.toEqual(validResponseBody)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${apiConfig.sheltersUrl}?lat=59&lon=18`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    })
  })

  it("rejects malformed successful responses", async () => {
    fetchMock.mockResolvedValue(Response.json({ shelters: "not an array" }))
    await expect(fetchNearestShelters(59.0, 18.0)).rejects.toBeInstanceOf(
      ShelterResponseValidationError
    )
  })

  it("reports HTTP server failures", async () => {
    fetchMock.mockResolvedValue(new Response("Internal error", { status: 500 }))
    await expect(fetchNearestShelters(59.0, 18.0)).rejects.toMatchObject({
      code: "http",
      status: 500,
    })
  })

  it("reports network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(fetchNearestShelters(59.0, 18.0)).rejects.toMatchObject({ code: "network" })
  })

  it("reports a successful response containing invalid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Login</html>"))
    await expect(fetchNearestShelters(59.0, 18.0)).rejects.toMatchObject({ code: "invalid_json" })
  })

  describe("cancellation and deadlines", () => {
    beforeEach(() => vi.useFakeTimers())

    it("does not start I/O for an already cancelled signal", async () => {
      const controller = new AbortController()
      controller.abort()
      await expect(fetchNearestShelters(59.0, 18.0, controller.signal)).rejects.toMatchObject({
        code: "aborted",
      })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })

    it("settles a cancelled request even if fetch ignores its signal", async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      const controller = new AbortController()
      const failure = expect(
        fetchNearestShelters(59.0, 18.0, controller.signal)
      ).rejects.toMatchObject({ code: "aborted" })
      controller.abort()
      await failure
    })

    it("times out after the configured deadline", async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}))
      const failure = expect(fetchNearestShelters(59.0, 18.0)).rejects.toBeInstanceOf(
        ShelterRequestError
      )
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
      await failure
    })
  })
})
