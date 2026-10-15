import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GeolocationRequestError, requestCurrentPosition } from "./geolocationService"

function makePositionError(code: 1 | 2 | 3, message = "error"): GeolocationPositionError {
  return {
    code,
    message,
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
  vi.unstubAllGlobals()
})

describe("requestCurrentPosition", () => {
  it("resolves with the device coordinates on success", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 59.334591, longitude: 18.06324 },
      } as GeolocationPosition)
    })

    await expect(requestCurrentPosition()).resolves.toEqual({ lat: 59.334591, lon: 18.06324 })
  })

  it("rejects with unsupported, without calling getCurrentPosition, when geolocation is absent", async () => {
    vi.stubGlobal("navigator", {})

    await expect(requestCurrentPosition()).rejects.toMatchObject({
      name: "GeolocationRequestError",
      code: "unsupported",
    })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it("maps a denied permission to permission_denied", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(1))
      }
    )

    await expect(requestCurrentPosition()).rejects.toMatchObject({
      name: "GeolocationRequestError",
      code: "permission_denied",
    })
  })

  it("maps an unavailable position to position_unavailable", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(2))
      }
    )

    await expect(requestCurrentPosition()).rejects.toMatchObject({
      name: "GeolocationRequestError",
      code: "position_unavailable",
    })
  })

  it("maps a timed-out request to timeout", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(3))
      }
    )

    await expect(requestCurrentPosition()).rejects.toMatchObject({
      name: "GeolocationRequestError",
      code: "timeout",
    })
  })

  it("exposes GeolocationRequestError as a subclass of Error", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(2))
      }
    )

    const error = await requestCurrentPosition().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GeolocationRequestError)
    expect(error).toBeInstanceOf(Error)
  })
})
