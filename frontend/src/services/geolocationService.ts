import type { GeolocationErrorCode } from "../types/address"

/** Identifies why the browser could not supply a device position. */
export class GeolocationRequestError extends Error {
  readonly code: GeolocationErrorCode

  constructor(code: GeolocationErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = "GeolocationRequestError"
    this.code = code
  }
}

/** A device position in decimal degrees, as read from the browser's Geolocation API. */
export interface Coordinates {
  lat: number
  lon: number
  /** The browser's own radius of uncertainty for this fix, in meters. */
  accuracy: number
}

// The result is always presented as approximate, so a faster first response matters more than
// enableHighAccuracy's extra precision and battery/time cost. enableHighAccuracy also only helps
// devices with a GPS chip; on desktops without one (the environment this was tested in) it would
// just add delay for no accuracy gain, so it stays off regardless of device type.
//
// timeout was raised from 10s to 15s after real desktop testing (no GPS hardware) hit a timeout
// at the original value: resolving a position without GPS commonly relies on slower Wi-Fi/IP
// based lookups.
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 0,
}

function mapPositionError(error: GeolocationPositionError): GeolocationRequestError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeolocationRequestError(
        "permission_denied",
        "Geolocation permission was denied.",
        {
          cause: error,
        }
      )
    case error.TIMEOUT:
      return new GeolocationRequestError("timeout", "The geolocation request timed out.", {
        cause: error,
      })
    default:
      return new GeolocationRequestError(
        "position_unavailable",
        "The device position is unavailable.",
        { cause: error }
      )
  }
}

/**
 * Requests the device's current position through the browser's Geolocation API.
 *
 * Checks for browser support before requesting anything, so an unsupported browser never
 * triggers a permission prompt.
 *
 * @throws {GeolocationRequestError} If the browser does not support geolocation, permission is
 * denied, the position is unavailable, or the request times out.
 */
export function requestCurrentPosition(): Promise<Coordinates> {
  if (!("geolocation" in navigator)) {
    return Promise.reject(
      new GeolocationRequestError("unsupported", "This browser does not support geolocation.")
    )
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => reject(mapPositionError(error)),
      POSITION_OPTIONS
    )
  })
}
