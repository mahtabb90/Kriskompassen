// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { useAddress } from "./useAddress"

function makePositionError(code: 1 | 2 | 3): GeolocationPositionError {
  return {
    code,
    message: "error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError
}

const getCurrentPosition = vi.fn()
let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  getCurrentPosition.mockReset()
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useAddress", () => {
  it("confirms a manually entered address", () => {
    const { result } = renderHook(() => useAddress())

    act(() => {
      result.current.submitManualAddress("  Testgatan 1  ")
    })

    expect(result.current.address).toEqual({
      text: "Testgatan 1",
      source: "manual",
      approximate: false,
    })
    expect(result.current.failed).toBe(false)
  })

  it("ignores an empty or whitespace-only manual address", () => {
    const { result } = renderHook(() => useAddress())

    act(() => {
      result.current.submitManualAddress("   ")
    })

    expect(result.current.address).toBeNull()
  })

  it("fetches the device position and reverse-geocodes it as an approximate address", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 59.3, longitude: 18.0, accuracy: 30 },
      } as GeolocationPosition)
    })
    fetchMock.mockResolvedValue(
      Response.json({
        found: true,
        address: "Drottninggatan 1, Stockholm",
        municipality: "Stockholm kommun",
        county: "Stockholms län",
        lat: 59.3,
        lon: 18.0,
      })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.requestLocation()
    })
    expect(result.current.loading).toBe(true)

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.failed).toBe(false)
    expect(result.current.address).toEqual({
      text: "Drottninggatan 1, Stockholm",
      source: "geolocated",
      approximate: true,
      lat: 59.3,
      lon: 18.0,
      municipality: "Stockholm kommun",
      accuracy: 30,
    })
  })

  it("reports a denied permission while keeping manual entry usable", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(1))
      }
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.requestLocation()
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(result.current.errorMessage).toContain("manuellt")
    expect(result.current.address).toBeNull()
  })

  it("reports an unsupported browser without calling getCurrentPosition", async () => {
    vi.stubGlobal("navigator", {})

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.requestLocation()
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("reports a geocode timeout distinctly from a geolocation failure", async () => {
    vi.useFakeTimers()
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({ coords: { latitude: 59.3, longitude: 18.0 } } as GeolocationPosition)
    })
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = (options as RequestInit).signal
          signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")))
        })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.requestLocation()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
    })

    expect(result.current.failed).toBe(true)
    expect(result.current.address).toBeNull()
  })

  it("reports a resolvable-but-unknown position without discarding the previous address", async () => {
    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.submitManualAddress("Testgatan 1")
    })

    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition)
    })
    fetchMock.mockResolvedValue(
      Response.json({ found: false, message: "Ingen adress kunde hittas." })
    )

    act(() => {
      result.current.requestLocation()
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(result.current.errorMessage).toBe("Ingen adress kunde hittas.")
    expect(result.current.address).toEqual({
      text: "Testgatan 1",
      source: "manual",
      approximate: false,
    })
  })

  it("reverse-geocodes a typed coordinate pair as an approximate address with no accuracy", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        found: true,
        address: "Drottninggatan 1, Stockholm",
        municipality: "Stockholm kommun",
        county: "Stockholms län",
        lat: 59.3293,
        lon: 18.0686,
      })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.submitCoordinates(59.3293, 18.0686)
    })
    expect(result.current.loading).toBe(true)
    expect(getCurrentPosition).not.toHaveBeenCalled()

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.failed).toBe(false)
    expect(result.current.address).toEqual({
      text: "Drottninggatan 1, Stockholm",
      source: "coordinates",
      approximate: true,
      lat: 59.3293,
      lon: 18.0686,
      municipality: "Stockholm kommun",
    })
  })

  it("reports a resolvable-but-unknown coordinate pair with the backend's message", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ found: false, message: "Ingen adress kunde hittas." })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.submitCoordinates(0, 0)
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(result.current.errorMessage).toBe("Ingen adress kunde hittas.")
  })

  it("reports a coordinate geocode timeout with a coordinate-specific message", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = (options as RequestInit).signal
          signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")))
        })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.submitCoordinates(59.3293, 18.0686)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
    })

    expect(result.current.failed).toBe(true)
    expect(result.current.errorMessage).toContain("koordinaterna")
  })

  it("reports a coordinate network failure without discarding a previous manual address", async () => {
    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.submitManualAddress("Testgatan 1")
    })

    fetchMock.mockRejectedValue(new TypeError("network down"))

    act(() => {
      result.current.submitCoordinates(59.3293, 18.0686)
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(result.current.address).toEqual({
      text: "Testgatan 1",
      source: "manual",
      approximate: false,
    })
  })

  it("discards a second concurrent location request", async () => {
    let releaseFirst: (() => void) | undefined
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      releaseFirst = () =>
        onSuccess({ coords: { latitude: 59.3, longitude: 18.0 } } as GeolocationPosition)
    })
    fetchMock.mockResolvedValue(
      Response.json({ found: true, address: "Somewhere", lat: 59.3, lon: 18.0 })
    )

    const { result } = renderHook(() => useAddress())
    act(() => {
      result.current.requestLocation()
      result.current.requestLocation()
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    await act(async () => {
      releaseFirst?.()
    })

    expect(result.current.address).toMatchObject({ text: "Somewhere" })
  })
})
