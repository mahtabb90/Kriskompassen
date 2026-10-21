import type { Shelter, ShelterListResponse, ShelterSource } from "../types/shelter"

/** Identifies shelter data that cannot be displayed or cached safely. */
export class ShelterResponseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ShelterResponseValidationError"
  }
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === "string"
}

function isNullableFiniteNumber(value: unknown): value is number | null | undefined {
  return (
    value === null || value === undefined || (typeof value === "number" && Number.isFinite(value))
  )
}

function validateShelter(payload: unknown): Shelter {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ShelterResponseValidationError("A shelter is not an object.")
  }
  const record = payload as Record<string, unknown>
  const { id, number, address, lat, lon, capacity, type } = record
  if (
    typeof id !== "string" ||
    !id ||
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lon !== "number" ||
    !Number.isFinite(lon) ||
    !isNullableString(number) ||
    !isNullableString(address) ||
    !isNullableFiniteNumber(capacity) ||
    !isNullableString(type)
  ) {
    throw new ShelterResponseValidationError("A shelter has invalid or missing fields.")
  }
  return {
    id,
    number: number ?? null,
    address: address ?? null,
    lat,
    lon,
    capacity: capacity ?? null,
    type: type ?? null,
  }
}

function validateSource(payload: unknown): ShelterSource {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ShelterResponseValidationError("The shelter source is not an object.")
  }
  const record = payload as Record<string, unknown>
  const { name, url, apiName, apiUrl } = record
  if (
    typeof name !== "string" ||
    !name ||
    typeof url !== "string" ||
    !url ||
    typeof apiName !== "string" ||
    !apiName ||
    typeof apiUrl !== "string" ||
    !apiUrl
  ) {
    throw new ShelterResponseValidationError("The shelter source has invalid or missing fields.")
  }
  return { name, url, apiName, apiUrl }
}

/**
 * Validates the /shelters/nearest response in source order; an empty shelter list is valid.
 *
 * @throws {ShelterResponseValidationError} For an invalid list, item, source, or search radius.
 */
export function validateShelterListResponse(payload: unknown): ShelterListResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ShelterResponseValidationError("The shelter response is not an object.")
  }
  const record = payload as Record<string, unknown>
  const { shelters, source, bboxRadiusMetersUsed } = record
  if (!Array.isArray(shelters)) {
    throw new ShelterResponseValidationError("The shelter list is not an array.")
  }
  if (typeof bboxRadiusMetersUsed !== "number" || !Number.isFinite(bboxRadiusMetersUsed)) {
    throw new ShelterResponseValidationError("The search radius is missing or invalid.")
  }
  return {
    shelters: shelters.map(validateShelter),
    source: validateSource(source),
    bboxRadiusMetersUsed,
  }
}
