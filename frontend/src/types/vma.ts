/**
 * Represents a structurally validated VMA record with unvalidated fields.
 *
 * Guarantees an object only; consumers must validate individual fields before using them.
 */
export type VmaRecord = Record<string, unknown>

export type VmaRequestErrorCode = "network" | "http" | "timeout" | "invalid_json"
