import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import {
  GeocodeRequestError,
  GeocodeResponseValidationError,
  fetchGeocode,
} from "./geocodingService"

function requestSignal(options?: RequestInit): AbortSignal {
  if (!options?.signal) throw new Error("Expected a per-request abort signal.")
  return options.signal
}

let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("fetchGeocode", () => {
  it("requests the configured backend without credentials and maps a found result", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        found: true,
        address: "Drottninggatan 1, Stockholm",
        municipality: "Stockholm kommun",
        county: "Stockholms län",
        lat: 59.334591,
        lon: 18.06324,
      })
    )

    const result = await fetchGeocode(59.334591, 18.06324)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${apiConfig.geocodeUrl}?lat=59.334591&lon=18.06324`,
      {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: expect.any(AbortSignal),
      }
    )
    expect(result).toEqual({
      found: true,
      address: "Drottninggatan 1, Stockholm",
      municipality: "Stockholm kommun",
      county: "Stockholms län",
      lat: 59.334591,
      lon: 18.06324,
    })
  })

  it("maps a negative result without treating it as an error", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ found: false, message: "Ingen adress kunde hittas." })
    )

    await expect(fetchGeocode(0, 0)).resolves.toEqual({
      found: false,
      message: "Ingen adress kunde hittas.",
    })
  })

  it("defaults a missing municipality or county to null", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ found: true, address: "Somewhere", lat: 1, lon: 2 })
    )

    await expect(fetchGeocode(1, 2)).resolves.toEqual({
      found: true,
      address: "Somewhere",
      municipality: null,
      county: null,
      lat: 1,
      lon: 2,
    })
  })

  it.each([502, 504])(
    "preserves HTTP %s as an HTTP failure and releases the request",
    async (status) => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValue(new Response("Upstream failure", { status }))

      await expect(fetchGeocode(1, 2)).rejects.toMatchObject({
        name: "GeocodeRequestError",
        code: "http",
        status,
      })
      expect(requestSignal(fetchMock.mock.calls[0][1]).aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it("preserves a network failure without converting it to a found or not-found result", async () => {
    const cause = new TypeError("Connection failed")
    fetchMock.mockRejectedValue(cause)

    await expect(fetchGeocode(1, 2)).rejects.toMatchObject({
      name: "GeocodeRequestError",
      code: "network",
      cause,
    })
  })

  it("reports malformed JSON separately from an invalid envelope", async () => {
    fetchMock.mockResolvedValue(new Response("{"))

    await expect(fetchGeocode(1, 2)).rejects.toMatchObject({
      name: "GeocodeRequestError",
      code: "invalid_json",
      cause: expect.any(SyntaxError),
    })
  })

  it("aborts a request that has not received headers within the configured deadline", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          requestSignal(options).addEventListener("abort", () =>
            reject(new DOMException("", "AbortError"))
          )
        })
    )

    const request = fetchGeocode(1, 2)
    const failure = expect(request).rejects.toMatchObject({
      name: "GeocodeRequestError",
      code: "timeout",
    })
    const signal = requestSignal(fetchMock.mock.calls[0][1])

    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs - 1)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    await failure
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    ["a non-object body", Response.json("not an object")],
    ["a found result missing the address field", Response.json({ found: true, lat: 1, lon: 2 })],
    ["a not-found result missing the message field", Response.json({ found: false })],
    ["a found field that is neither true nor false", Response.json({ found: "yes" })],
  ])("rejects %s as a contract violation", async (_description, response) => {
    fetchMock.mockResolvedValue(response)

    await expect(fetchGeocode(1, 2)).rejects.toBeInstanceOf(GeocodeResponseValidationError)
  })

  it("exposes GeocodeRequestError as a subclass with the request code", async () => {
    fetchMock.mockResolvedValue(new Response("Upstream failure", { status: 503 }))

    const error = await fetchGeocode(1, 2).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GeocodeRequestError)
  })
})
