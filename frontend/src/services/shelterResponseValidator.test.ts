import { describe, expect, it } from "vitest"
import {
  ShelterResponseValidationError,
  validateShelterListResponse,
} from "./shelterResponseValidator"

const validSource = {
  name: "Myndigheten för civilt försvar (MCF)",
  url: "https://example.com/metadata",
  apiName: "MCF WFS (OGC API Features)",
  apiUrl: "https://inspire.mcf.se/skyddsrum/wfs",
}

const validShelter = {
  id: "a0f314b8-0532-4783-a949-df9ff4a9d73d",
  number: "120599-3",
  address: "Kantarellen 11",
  lat: 59.352,
  lon: 18.152,
  capacity: 200,
  type: "Skyddsrum",
}

function validResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    shelters: [validShelter],
    source: validSource,
    bboxRadiusMetersUsed: 2000,
    ...overrides,
  }
}

describe("validateShelterListResponse", () => {
  it("accepts a complete response", () => {
    expect(validateShelterListResponse(validResponse())).toEqual({
      shelters: [validShelter],
      source: validSource,
      bboxRadiusMetersUsed: 2000,
    })
  })

  it("accepts an empty shelter list", () => {
    expect(validateShelterListResponse(validResponse({ shelters: [] }))).toEqual({
      shelters: [],
      source: validSource,
      bboxRadiusMetersUsed: 2000,
    })
  })

  it("normalizes missing optional shelter fields to null", () => {
    const minimalShelter = { id: validShelter.id, lat: validShelter.lat, lon: validShelter.lon }
    const result = validateShelterListResponse(validResponse({ shelters: [minimalShelter] }))
    expect(result.shelters[0]).toEqual({
      ...minimalShelter,
      number: null,
      address: null,
      capacity: null,
      type: null,
    })
  })

  it.each([
    "not an object",
    [],
    null,
    { source: validSource, bboxRadiusMetersUsed: 2000 },
    { shelters: "not an array", source: validSource, bboxRadiusMetersUsed: 2000 },
    { shelters: [validShelter], source: validSource },
    { shelters: [validShelter], source: validSource, bboxRadiusMetersUsed: "2000" },
    { shelters: [validShelter], source: { ...validSource, apiUrl: "" } },
    { shelters: [{ ...validShelter, id: "" }], source: validSource, bboxRadiusMetersUsed: 2000 },
    { shelters: [{ ...validShelter, lat: "59" }], source: validSource, bboxRadiusMetersUsed: 2000 },
    {
      shelters: [{ ...validShelter, lon: Number.NaN }],
      source: validSource,
      bboxRadiusMetersUsed: 2000,
    },
    {
      shelters: [{ ...validShelter, capacity: "200" }],
      source: validSource,
      bboxRadiusMetersUsed: 2000,
    },
    {
      shelters: [{ ...validShelter, number: 12_0599 }],
      source: validSource,
      bboxRadiusMetersUsed: 2000,
    },
  ])("rejects a malformed payload: %j", (payload) => {
    expect(() => validateShelterListResponse(payload)).toThrow(ShelterResponseValidationError)
  })
})
