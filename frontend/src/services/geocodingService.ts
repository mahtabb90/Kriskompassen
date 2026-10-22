import { apiConfig } from "../config/apiConfig"
import type { GeocodeCandidate, GeocodeRequestErrorCode, GeocodeResult } from "../types/address"

/**
 * Identifies a failed geocode request without treating it as a resolvable-but-unknown position.
 *
 * Exposes the HTTP status only for HTTP failures and preserves the original cause when available.
 */
export class GeocodeRequestError extends Error {
  readonly code: GeocodeRequestErrorCode
  readonly status: number | undefined

  constructor(
    code: GeocodeRequestErrorCode,
    message: string,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause })
    this.name = "GeocodeRequestError"
    this.code = code
    this.status = options?.status
  }
}

/** Identifies a backend response that does not match the documented geocode contract. */
export class GeocodeResponseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GeocodeResponseValidationError"
  }
}

/**
 * Fetches and decodes one geocode response from the backend without validating its structure.
 *
 * Sends no credentials. Each call has its own abort controller and a timeout that includes reading
 * the response body. Does not retry or cache.
 *
 * @throws {GeocodeRequestError} For network failures, non-successful HTTP status, timeout or invalid JSON.
 */
async function fetchGeocodeResponse(lat: number, lon: number): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs)
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })

  try {
    const response = await fetch(`${apiConfig.geocodeUrl}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new GeocodeRequestError(
        "http",
        `The geocode request failed with HTTP ${response.status}.`,
        { status: response.status }
      )
    }

    return await response.json()
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeocodeRequestError("timeout", "The geocode request timed out.", { cause: error })
    }

    if (error instanceof GeocodeRequestError) {
      throw error
    }

    if (error instanceof SyntaxError) {
      throw new GeocodeRequestError("invalid_json", "The geocode response is not valid JSON.", {
        cause: error,
      })
    }

    throw new GeocodeRequestError("network", "The geocode request could not be completed.", {
      cause: error,
    })
  } finally {
    clearTimeout(timeout)
    // Release any unread body when an HTTP failure is reported before it finishes streaming.
    controller.abort()
  }
}

/**
 * Validates the backend's normalized geocode envelope.
 *
 * found:false is a valid outcome (the backend could not resolve the position) and is returned
 * rather than thrown; only a response that violates the documented contract throws.
 *
 * @throws {GeocodeResponseValidationError} If the response does not match the documented contract.
 */
function validateGeocodeResponse(payload: unknown): GeocodeResult {
  if (typeof payload !== "object" || payload === null) {
    throw new GeocodeResponseValidationError("The geocode response is not an object.")
  }
  const record = payload as Record<string, unknown>

  if (record.found === true) {
    if (
      typeof record.address !== "string" ||
      typeof record.lat !== "number" ||
      typeof record.lon !== "number"
    ) {
      throw new GeocodeResponseValidationError(
        "The geocode response is missing a required address field."
      )
    }
    return {
      found: true,
      address: record.address,
      municipality: typeof record.municipality === "string" ? record.municipality : null,
      county: typeof record.county === "string" ? record.county : null,
      lat: record.lat,
      lon: record.lon,
    }
  }

  if (record.found === false) {
    if (typeof record.message !== "string") {
      throw new GeocodeResponseValidationError(
        "The geocode response is missing a message for a negative result."
      )
    }
    return { found: false, message: record.message }
  }

  throw new GeocodeResponseValidationError("The geocode response has an invalid found field.")
}

/**
 * Reverse-geocodes one coordinate pair through the backend.
 *
 * @returns A discriminated result: found:true with a readable address, or found:false with an
 * explanatory message. Neither outcome is an error.
 * @throws {GeocodeRequestError} If fetching or decoding the response fails.
 * @throws {GeocodeResponseValidationError} If the response does not match the documented contract.
 */
export async function fetchGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  return validateGeocodeResponse(await fetchGeocodeResponse(lat, lon))
}

/**
 * Fetches and decodes one address-search response from the backend without validating structure.
 *
 * Sends no credentials. Each call has its own abort controller and a timeout that includes
 * reading the response body. Does not retry or cache.
 *
 * @throws {GeocodeRequestError} For network failures, non-successful HTTP status, timeout or
 * invalid JSON.
 */
async function fetchSearchResponse(query: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs)
  const params = new URLSearchParams({ q: query })

  try {
    const response = await fetch(`${apiConfig.geocodeSearchUrl}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new GeocodeRequestError(
        "http",
        `The address search request failed with HTTP ${response.status}.`,
        { status: response.status }
      )
    }

    return await response.json()
  } catch (error) {
    if (controller.signal.aborted) {
      throw new GeocodeRequestError("timeout", "The address search request timed out.", {
        cause: error,
      })
    }

    if (error instanceof GeocodeRequestError) {
      throw error
    }

    if (error instanceof SyntaxError) {
      throw new GeocodeRequestError(
        "invalid_json",
        "The address search response is not valid JSON.",
        { cause: error }
      )
    }

    throw new GeocodeRequestError("network", "The address search request could not be completed.", {
      cause: error,
    })
  } finally {
    clearTimeout(timeout)
    // Release any unread body when an HTTP failure is reported before it finishes streaming.
    controller.abort()
  }
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === "string"
}

/**
 * Validates the backend's address-search envelope.
 *
 * @throws {GeocodeResponseValidationError} If the response does not match the documented contract.
 */
function validateCandidates(payload: unknown): GeocodeCandidate[] {
  if (typeof payload !== "object" || payload === null) {
    throw new GeocodeResponseValidationError("The address search response is not an object.")
  }
  const record = payload as Record<string, unknown>
  if (!Array.isArray(record.candidates)) {
    throw new GeocodeResponseValidationError(
      "The address search response is missing a candidate list."
    )
  }
  return record.candidates.map((candidate, index) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new GeocodeResponseValidationError(`Candidate ${index} is not an object.`)
    }
    const { address, municipality, county, lat, lon } = candidate as Record<string, unknown>
    if (
      typeof address !== "string" ||
      !address ||
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      !isNullableString(municipality) ||
      !isNullableString(county)
    ) {
      throw new GeocodeResponseValidationError(`Candidate ${index} has invalid or missing fields.`)
    }
    return { address, municipality: municipality ?? null, county: county ?? null, lat, lon }
  })
}

/**
 * Forward-geocodes free text (e.g. a manually typed address) into every plausible match.
 *
 * An empty list is a normal result for text the backend cannot resolve, not an error.
 * @throws {GeocodeRequestError} If fetching or decoding the response fails.
 * @throws {GeocodeResponseValidationError} If the response does not match the documented contract.
 */
export async function fetchAddressCandidates(query: string): Promise<GeocodeCandidate[]> {
  return validateCandidates(await fetchSearchResponse(query))
}
