import { apiConfig } from "../config/apiConfig"
import type { CrisisItem } from "../types/crisis"
import {
  CrisisResponseValidationError,
  validateCrisisArticle,
  validateCrisisArticles,
} from "./crisisResponseValidator"

type CrisisRequestErrorCode = "network" | "http" | "timeout" | "invalid_json" | "aborted"
const NOT_FOUND = Symbol("crisis_not_found")

/** Distinguishes article transport failures from a documented missing-article result. */
export class CrisisRequestError extends Error {
  readonly code: CrisisRequestErrorCode
  readonly status: number | undefined

  constructor(
    code: CrisisRequestErrorCode,
    message: string,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause })
    this.name = "CrisisRequestError"
    this.code = code
    this.status = options?.status
  }
}

function isDocumentedNotFound(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return false
  const error = payload.error
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "crisis_not_found" &&
    "message" in error &&
    typeof error.message === "string" &&
    Boolean(error.message.trim())
  )
}

async function fetchCrisisResponse(
  url: string,
  signal?: AbortSignal,
  allowNotFound = false
): Promise<unknown> {
  if (signal?.aborted) throw new CrisisRequestError("aborted", "The article request was cancelled.")

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
      if (allowNotFound && response.status === 404) {
        // Generic deployment/router 404s must not masquerade as an absent article.
        try {
          if (isDocumentedNotFound(await response.json())) return NOT_FOUND
        } catch {
          // The outer deadline/cancellation race still applies to this response body.
        }
      }
      throw new CrisisRequestError("http", `Article request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }
    return await response.json()
  }

  try {
    // A logical deadline also settles callers if a transport ignores AbortSignal.
    return await Promise.race([readResponse(), aborted])
  } catch (error) {
    if (signal?.aborted) {
      throw new CrisisRequestError("aborted", "The article request was cancelled.", {
        cause: error,
      })
    }
    if (timedOut) {
      throw new CrisisRequestError("timeout", "The article request timed out.", { cause: error })
    }
    if (error instanceof CrisisRequestError) throw error
    if (error instanceof SyntaxError) {
      throw new CrisisRequestError("invalid_json", "The article response is not valid JSON.", {
        cause: error,
      })
    }
    throw new CrisisRequestError("network", "The article request could not be completed.", {
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
 * Fetches full validated articles without credentials, caching, retries or local storage writes.
 *
 * Applies a 10-second total deadline including the response body. API saving metadata is ignored;
 * actual saved status is read separately by the offline controls from IndexedDB.
 * @throws {CrisisRequestError} For transport, HTTP, timeout, cancellation or JSON failures.
 * @throws {CrisisResponseValidationError} If any article or the list is invalid.
 */
export async function fetchCrisisItems(signal?: AbortSignal): Promise<CrisisItem[]> {
  return validateCrisisArticles(await fetchCrisisResponse(apiConfig.crisisUrl, signal)).map(
    (article) => ({ ...article, savedOffline: false })
  )
}

/**
 * Fetches one validated article, returning undefined only for the API's documented 404 code.
 *
 * Encodes the requested ID as a single URL segment. Uses the same deadline and cancellation
 * contract as fetchCrisisItems and never changes existing offline copies.
 * @throws {CrisisRequestError} For transport failures, including generic HTTP 404 responses.
 * @throws {CrisisResponseValidationError} For invalid content or an unexpected response ID.
 */
export async function fetchCrisisItem(
  id: string,
  signal?: AbortSignal
): Promise<CrisisItem | undefined> {
  const payload = await fetchCrisisResponse(
    `${apiConfig.crisisUrl}/${encodeURIComponent(id)}`,
    signal,
    true
  )
  if (payload === NOT_FOUND) return undefined
  const article = validateCrisisArticle(payload)
  if (article.id !== id) {
    throw new CrisisResponseValidationError("The response ID does not match the requested article.")
  }
  return { ...article, savedOffline: false }
}
