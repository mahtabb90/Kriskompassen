import type { VmaRecord } from "../types/vma"

/** Distinguishes an unexpected response structure from transport and JSON decoding failures. */
export class VmaResponseValidationError extends Error {
  constructor() {
    super("The VMA response must be an array of objects.")
    this.name = "VmaResponseValidationError"
  }
}

/**
 * Validates the response container without interpreting or changing individual VMA fields.
 *
 * @param response Decoded JSON received from the backend.
 * @returns The original object array, including an empty array when no messages were returned.
 * @throws {VmaResponseValidationError} If the response is not an array of non-null objects.
 */
export function validateVmaResponse(response: unknown): VmaRecord[] {
  if (!Array.isArray(response)) {
    throw new VmaResponseValidationError()
  }

  for (const item of response) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new VmaResponseValidationError()
    }
  }

  return response
}
