// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCurrentPosition } from "./useCurrentPosition"

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

beforeEach(() => {
  getCurrentPosition.mockReset()
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useCurrentPosition", () => {
  it("resolves with the device coordinates and accuracy, and bumps recenterToken", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 59.3, longitude: 18.0, accuracy: 25 },
      } as GeolocationPosition)
    })

    const { result } = renderHook(() => useCurrentPosition())
    expect(result.current.recenterToken).toBe(0)
    expect(result.current.accuracy).toBeNull()

    act(() => {
      result.current.requestPosition()
    })
    expect(result.current.loading).toBe(true)

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.failed).toBe(false)
    expect(result.current.position).toEqual({ lat: 59.3, lon: 18.0 })
    expect(result.current.accuracy).toBe(25)
    expect(result.current.recenterToken).toBe(1)
  })

  it("bumps recenterToken again on a second successful fetch, even to the same coordinates", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({ coords: { latitude: 59.3, longitude: 18.0 } } as GeolocationPosition)
    })

    const { result } = renderHook(() => useCurrentPosition())
    act(() => {
      result.current.requestPosition()
    })
    await act(async () => {})
    expect(result.current.recenterToken).toBe(1)

    act(() => {
      result.current.requestPosition()
    })
    await act(async () => {})
    expect(result.current.recenterToken).toBe(2)
  })

  it("reports a denied permission in Swedish, without discarding a previously fetched position", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({ coords: { latitude: 59.3, longitude: 18.0 } } as GeolocationPosition)
    })

    const { result } = renderHook(() => useCurrentPosition())
    act(() => {
      result.current.requestPosition()
    })
    await act(async () => {})
    const fetchedPosition = result.current.position

    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(1))
      }
    )
    act(() => {
      result.current.requestPosition()
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(result.current.errorMessage).toBe(
      "Platsbehörighet nekades. Du kan ange din adress manuellt istället."
    )
    expect(result.current.position).toEqual(fetchedPosition)
    expect(result.current.recenterToken).toBe(1)
  })

  it("reports an unsupported browser without calling getCurrentPosition", async () => {
    vi.stubGlobal("navigator", {})

    const { result } = renderHook(() => useCurrentPosition())
    act(() => {
      result.current.requestPosition()
    })
    await act(async () => {})

    expect(result.current.failed).toBe(true)
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("discards a second concurrent position request", async () => {
    let releaseFirst: (() => void) | undefined
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      releaseFirst = () =>
        onSuccess({ coords: { latitude: 59.3, longitude: 18.0 } } as GeolocationPosition)
    })

    const { result } = renderHook(() => useCurrentPosition())
    act(() => {
      result.current.requestPosition()
      result.current.requestPosition()
    })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    await act(async () => {
      releaseFirst?.()
    })

    expect(result.current.position).toEqual({ lat: 59.3, lon: 18.0 })
    expect(result.current.recenterToken).toBe(1)
  })
})
