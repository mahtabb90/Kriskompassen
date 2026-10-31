import { apiConfig } from "../config/apiConfig"
import type { ShelterBoundsResponse, ShelterListResponse } from "../types/shelter"
import {
  validateShelterBoundsResponse,
  validateShelterListResponse,
} from "./shelterResponseValidator"

type ShelterRequestErrorCode = "network" | "http" | "timeout" | "invalid_json" | "aborted"

/** Distinguishes shelter transport failures from a validation failure of a 2xx response. */
export class ShelterRequestError extends Error {
  readonly code: ShelterRequestErrorCode
  readonly status: number | undefined

  constructor(
    code: ShelterRequestErrorCode,
    message: string,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause })
    this.name = "ShelterRequestError"
    this.code = code
    this.status = options?.status
  }
}

export async function fetchShelterResponse(url: string, signal?: AbortSignal): Promise<unknown> {
  if (signal?.aborted) {
    throw new ShelterRequestError("aborted", "The shelter request was cancelled.")
  }

  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener("abort", cancel, { once: true })
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, apiConfig.timeoutMs)
  let rejectAbort: () => void = () => {}
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(new DOMException("The request was cancelled.", "AbortError"))
    controller.signal.addEventListener("abort", rejectAbort, { once: true })
  })

  async function readResponse(): Promise<unknown> {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new ShelterRequestError(
        "http",
        `Shelter request failed with HTTP ${response.status}.`,
        { status: response.status }
      )
    }
    return await response.json()
  }

  try {
    // A logical deadline also settles callers if a transport ignores AbortSignal.
    return await Promise.race([readResponse(), aborted])
  } catch (error) {
    if (signal?.aborted) {
      throw new ShelterRequestError("aborted", "The shelter request was cancelled.", {
        cause: error,
      })
    }
    if (timedOut) {
      throw new ShelterRequestError("timeout", "The shelter request timed out.", { cause: error })
    }
    if (error instanceof ShelterRequestError) throw error
    if (error instanceof SyntaxError) {
      throw new ShelterRequestError("invalid_json", "The shelter response is not valid JSON.", {
        cause: error,
      })
    }
    throw new ShelterRequestError("network", "The shelter request could not be completed.", {
      cause: error,
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", cancel)
    controller.signal.removeEventListener("abort", rejectAbort)
    controller.abort()
  }
}

/**
 * Fetches the nearest shelters for one position without credentials, caching or retries.
 *
 * Applies a total deadline including the response body, matching the article transport's
 * contract. Caching the result locally (for offline reuse) is the caller's responsibility.
 *
 * @throws {ShelterRequestError} For transport, HTTP, timeout, cancellation or JSON failures.
 * @throws {ShelterResponseValidationError} If the response body is malformed.
 */
export async function fetchNearestShelters(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ShelterListResponse> {
  const url = `${apiConfig.sheltersUrl}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  return validateShelterListResponse(await fetchShelterResponse(url, signal))
}

/** Rectangular map viewport, in degrees, matching MapLibre's LngLatBounds accessors. */
export interface ShelterBounds {
  north: number
  south: number
  east: number
  west: number
}

/**
 * Fetches every shelter from the local snapshot inside one map viewport, without credentials,
 * caching or retries. Shares fetchShelterResponse's deadline/abort/error handling with
 * fetchNearestShelters.
 *
 * @throws {ShelterRequestError} For transport, HTTP, timeout, cancellation or JSON failures.
 * @throws {ShelterResponseValidationError} If the response body is malformed.
 */
export async function fetchSheltersWithinBounds(
  bounds: ShelterBounds,
  signal?: AbortSignal
): Promise<ShelterBoundsResponse> {
  const { north, south, east, west } = bounds
  const url =
    `${apiConfig.sheltersWithinBoundsUrl}?north=${encodeURIComponent(north)}` +
    `&south=${encodeURIComponent(south)}&east=${encodeURIComponent(east)}` +
    `&west=${encodeURIComponent(west)}`
  return validateShelterBoundsResponse(await fetchShelterResponse(url, signal))
}
