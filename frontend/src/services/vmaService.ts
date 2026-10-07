import { apiConfig } from "../config/apiConfig"
import type { VmaRequestErrorCode, VmaResult } from "../types/vma"
import { mapVmaMessages } from "./vmaMapper"
import { validateVmaResponse } from "./vmaResponseValidator"

/**
 * Identifies a failed VMA request without treating it as a successful empty response.
 *
 * Exposes the HTTP status only for HTTP failures and preserves the original cause when available.
 */
export class VmaRequestError extends Error {
  readonly code: VmaRequestErrorCode
  readonly status: number | undefined

  constructor(
    code: VmaRequestErrorCode,
    message: string,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause })
    this.name = "VmaRequestError"
    this.code = code
    this.status = options?.status
  }
}

/**
 * Fetches and decodes one VMA response from the backend without validating its structure.
 *
 * Sends no credentials. Each call has its own abort controller and a timeout that includes reading
 * the response body. Does not retry, cache, or convert failures to empty results.
 *
 * @returns Unvalidated JSON, including the envelope around a successful empty alerts list.
 * @throws {VmaRequestError} For network failures, non-successful HTTP status, timeout or invalid JSON.
 */
export async function fetchVmaResponse(): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs)

  try {
    const response = await fetch(apiConfig.vmaUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new VmaRequestError("http", `The VMA request failed with HTTP ${response.status}.`, {
        status: response.status,
      })
    }

    return await response.json()
  } catch (error) {
    if (controller.signal.aborted) {
      throw new VmaRequestError("timeout", "The VMA request timed out.", { cause: error })
    }

    if (error instanceof VmaRequestError) {
      throw error
    }

    if (error instanceof SyntaxError) {
      throw new VmaRequestError("invalid_json", "The VMA response is not valid JSON.", {
        cause: error,
      })
    }

    throw new VmaRequestError("network", "The VMA request could not be completed.", {
      cause: error,
    })
  } finally {
    clearTimeout(timeout)
    // Release any unread body when an HTTP failure is reported before it finishes streaming.
    controller.abort()
  }
}

/**
 * Fetches, validates and maps VMA messages while preserving partial-response diagnostics.
 *
 * @returns Shared presentation models and counts/issues for excluded or rejected records.
 * A successful empty upstream response returns an empty messages list and zero counts.
 * @throws {VmaRequestError} If fetching or decoding the response fails.
 * @throws {VmaResponseValidationError} For an invalid container or only malformed records.
 */
export async function fetchVmas(): Promise<VmaResult> {
  const { records, ...diagnostics } = validateVmaResponse(await fetchVmaResponse())
  const evaluatedAt = Date.now()
  return {
    messages: mapVmaMessages(records, diagnostics.source, evaluatedAt),
    evaluatedAt: new Date(evaluatedAt).toISOString(),
    ...diagnostics,
  }
}
