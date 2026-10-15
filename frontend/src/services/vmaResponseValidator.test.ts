import { describe, expect, it } from "vitest"
import { alert, cachedResponse, feed, feedData, info, source } from "./__fixtures__/vma"
import { validateVmaResponse, VmaResponseValidationError } from "./vmaResponseValidator"

describe("validateVmaResponse", () => {
  it("accepts the documented SR fields and preserves source metadata", () => {
    expect(validateVmaResponse(feed())).toMatchObject({
      source,
      feedUpdatedAt: "2026-10-05T12:00:00.000Z",
      records: [
        {
          identifier: alert.identifier,
          incidents: [alert.incidents],
          sent: "2026-10-05T11:00:00.000Z",
          msgType: "Alert",
          references: [],
          info: [
            {
              event: info.event,
              description: info.description,
              expires: "2026-10-05T16:00:00.000Z",
            },
          ],
        },
      ],
      issues: [],
      rejectedCount: 0,
      excludedCount: 0,
    })
  })

  it("distinguishes a genuinely empty feed from validation errors and keeps provenance", () => {
    expect(validateVmaResponse(feed([]))).toEqual({
      source,
      feedUpdatedAt: "2026-10-05T12:00:00.000Z",
      checkedAt: "2026-10-05T12:00:30.000Z",
      stale: false,
      records: [],
      issues: [],
      rejectedCount: 0,
      excludedCount: 0,
    })
  })

  it.each([
    null,
    undefined,
    {},
    [],
    { alerts: [] },
    "[]",
    123,
    true,
    cachedResponse({ ...feedData(), timestamp: "invalid" }),
    cachedResponse({ ...feedData(), alerts: {} }),
    cachedResponse({ ...feedData(), source: undefined }),
  ])("rejects an invalid envelope: %j", (value) => {
    expect(() => validateVmaResponse(value)).toThrow(VmaResponseValidationError)
  })

  it.each([
    { name: "the former unwrapped feed", value: feedData() },
    { name: "a missing check time", value: { data: feedData(), stale: false } },
    { name: "a null check time", value: cachedResponse(feedData(), { checkedAt: null }) },
    { name: "an invalid check time", value: cachedResponse(feedData(), { checkedAt: "invalid" }) },
    {
      name: "a check time without timezone",
      value: cachedResponse(feedData(), { checkedAt: "2026-10-05T12:00:30" }),
    },
    {
      name: "a missing stale flag",
      value: { data: feedData(), checkedAt: "2026-10-05T12:00:30Z" },
    },
    { name: "a string stale flag", value: cachedResponse(feedData(), { stale: "false" }) },
    { name: "a numeric stale flag", value: cachedResponse(feedData(), { stale: 0 }) },
    { name: "a null stale flag", value: cachedResponse(feedData(), { stale: null }) },
    { name: "missing data", value: cachedResponse(undefined) },
    { name: "null data", value: cachedResponse(null) },
    { name: "array data", value: cachedResponse([feedData()]) },
    { name: "text data", value: cachedResponse("feed") },
  ])("rejects a cache wrapper with $name", ({ value }) => {
    expect(() => validateVmaResponse(value)).toThrow(VmaResponseValidationError)
  })

  it("passes through stale data and normalizes the backend's check time", () => {
    expect(
      validateVmaResponse(
        cachedResponse(feedData(), { checkedAt: "2026-10-05T14:00:30.123456+02:00", stale: true })
      )
    ).toMatchObject({
      checkedAt: "2026-10-05T12:00:30.123Z",
      stale: true,
      feedUpdatedAt: "2026-10-05T12:00:00.000Z",
      records: [{ identifier: alert.identifier }],
    })
  })

  it.each([null, 1, "message", [], {}, { status: "Test" }])(
    "does not turn a fully invalid feed into an empty success: %j",
    (item) => {
      expect(() => validateVmaResponse(feed([item]))).toThrow(VmaResponseValidationError)
    }
  )

  it("preserves good peers and original diagnostic indices in a mixed response", () => {
    const result = validateVmaResponse(
      feed([
        null,
        alert,
        { ...alert, identifier: "bad", sender: false },
        { ...alert, identifier: "second" },
      ])
    )
    expect(result.records.map((record) => record.identifier)).toEqual([alert.identifier, "second"])
    expect(result.rejectedCount).toBe(2)
    expect(result.issues).toEqual([
      { index: 0, field: "$", code: "invalid_record" },
      { index: 2, field: "sender", code: "invalid_required_field" },
    ])
  })

  it.each(["identifier", "sender", "incidents", "sent", "status", "scope", "msgType"])(
    "requires a valid string for %s",
    (field) => {
      for (const invalid of [undefined, null, " \n ", 1, {}, [], [alert.status]]) {
        expect(() => validateVmaResponse(feed([{ ...alert, [field]: invalid }]))).toThrow(
          VmaResponseValidationError
        )
      }
    }
  )

  it.each(["event", "description", "senderName", "expires"])(
    "validates required Swedish info field %s",
    (field) => {
      expect(() =>
        validateVmaResponse(feed([{ ...alert, info: [{ ...info, [field]: false }] }]))
      ).toThrow(VmaResponseValidationError)
    }
  )

  it("attaches record diagnostics to an all-invalid error", () => {
    try {
      validateVmaResponse(feed([null, { ...alert, identifier: "" }]))
      expect.unreachable("Expected an invalid-response error")
    } catch (error) {
      expect(error).toBeInstanceOf(VmaResponseValidationError)
      expect((error as VmaResponseValidationError).issues).toEqual([
        { index: 0, field: "$", code: "invalid_record" },
        { index: 1, field: "identifier", code: "invalid_required_field" },
      ])
    }
  })

  it.each([
    { status: "Test" },
    { status: "Exercise" },
    { status: "System" },
    { status: "Draft" },
    { scope: "Private" },
    { scope: "Restricted" },
    { msgType: "Ack" },
    { msgType: "Error" },
  ])("excludes non-publication records separately from malformed peers: %j", (overrides) => {
    const result = validateVmaResponse(feed([{ ...alert, ...overrides }, alert, null]))
    expect(result.records).toHaveLength(1)
    expect(result.excludedCount).toBe(1)
    expect(result.rejectedCount).toBe(1)
  })

  it("allows excluded-only results without hiding malformed records behind a discriminator", () => {
    expect(validateVmaResponse(feed([{ ...alert, status: "Test" }]))).toMatchObject({
      records: [],
      rejectedCount: 0,
      excludedCount: 1,
    })
    expect(() => validateVmaResponse(feed([{ status: "Test" }, null]))).toThrow(
      VmaResponseValidationError
    )
    expect(validateVmaResponse(feed([{ ...alert, status: "Test" }, null]))).toMatchObject({
      records: [],
      rejectedCount: 1,
      excludedCount: 1,
      issues: [{ index: 1, field: "$", code: "invalid_record" }],
    })
  })

  it("keeps Cancel with null info instead of fabricating message text", () => {
    expect(
      validateVmaResponse(feed([{ ...alert, msgType: "Cancel", info: null }])).records[0]
    ).toMatchObject({ msgType: "Cancel", info: [] })
    expect(() => validateVmaResponse(feed([{ ...alert, info: null }]))).toThrow(
      VmaResponseValidationError
    )
  })

  it("selects Swedish information, retaining good blocks despite malformed siblings", () => {
    const result = validateVmaResponse(
      feed([
        {
          ...alert,
          info: [
            { ...info, language: "en-US", description: "English translation" },
            null,
            { ...info, description: "" },
            info,
            { ...info, description: "Ytterligare information." },
          ],
        },
      ])
    )
    expect(result.records[0].info.map((block) => block.description)).toEqual([
      info.description,
      "Ytterligare information.",
    ])
    expect(result.issues).toHaveLength(2)
    expect(result.rejectedCount).toBe(0)
  })

  it("excludes valid foreign-language-only messages but rejects malformed info", () => {
    expect(
      validateVmaResponse(feed([{ ...alert, info: [{ ...info, language: "en-US" }] }]))
        .excludedCount
    ).toBe(1)
    for (const invalid of [[], {}, [null], [{ ...info, language: null }]]) {
      expect(() => validateVmaResponse(feed([{ ...alert, info: invalid }]))).toThrow(
        VmaResponseValidationError
      )
    }
  })

  it("accepts absent and null optional values without losing the message", () => {
    const result = validateVmaResponse(
      feed([
        { ...alert, references: null, info: [{ ...info, instruction: null, web: "", area: null }] },
      ])
    )
    expect(result.records[0].info[0].area).toEqual([])
    expect(result.records[0].references).toEqual([])
    expect(result.issues).toEqual([])
  })

  it("omits malformed optional values and reports each one", () => {
    const result = validateVmaResponse(
      feed([
        {
          ...alert,
          references: 1,
          info: [{ ...info, instruction: [], web: "javascript:alert(1)", area: {} }],
        },
      ])
    )
    expect(result.records).toHaveLength(1)
    expect(result.rejectedCount).toBe(0)
    expect(result.records[0].info[0]).toMatchObject({
      area: [],
      web: undefined,
      instruction: undefined,
    })
    expect(result.issues.map((issue) => issue.field).sort()).toEqual([
      "info[0].area",
      "info[0].instruction",
      "info[0].web",
      "references",
    ])
  })

  it("normalizes feed, sent, expiry and reference times without mixing their meanings", () => {
    const result = validateVmaResponse(
      feed([
        {
          ...alert,
          msgType: "Update",
          references: `${alert.sender},previous,2026-10-05T12:00:00+02:00`,
        },
      ])
    )
    expect(result.feedUpdatedAt).toBe("2026-10-05T12:00:00.000Z")
    expect(result.records[0].sent).toBe("2026-10-05T11:00:00.000Z")
    expect(result.records[0].info[0].expires).toBe("2026-10-05T16:00:00.000Z")
    expect(result.records[0].references[0].sent).toBe("2026-10-05T10:00:00.000Z")
  })

  it.each([
    "2026-02-29T12:00:00Z",
    "2024-02-30T12:00:00Z",
    "2026-13-01T12:00:00Z",
    "2026-10-05T24:00:00Z",
    "2026-10-05T12:60:00Z",
    "2026-10-05T12:00:60Z",
    "2026-10-05T12:00:00+24:00",
    "2026-10-05T12:00:00",
    "2026-10-05",
    "garbage",
  ])("rejects invalid required dates and omits invalid optional reference dates: %s", (date) => {
    expect(() => validateVmaResponse(feed([{ ...alert, sent: date }]))).toThrow(
      VmaResponseValidationError
    )
    expect(() =>
      validateVmaResponse(feed([{ ...alert, info: [{ ...info, expires: date }] }]))
    ).toThrow(VmaResponseValidationError)
    const result = validateVmaResponse(
      feed([{ ...alert, references: `${alert.sender},previous,${date}` }])
    )
    expect(result.records[0].references).toEqual([])
    expect(result.issues).toEqual([
      { index: 0, field: "references", code: "invalid_optional_field" },
    ])
  })

  it("accepts real leap days and timezone offsets", () => {
    expect(
      validateVmaResponse(feed([{ ...alert, sent: "2024-02-29T23:00:00-02:00" }])).records[0].sent
    ).toBe("2024-03-01T01:00:00.000Z")
  })

  it("preserves area names and valid geographic codes without manufacturing coverage", () => {
    const result = validateVmaResponse(
      feed([
        {
          ...alert,
          info: [
            {
              ...info,
              area: [
                { areaDesc: "Stockholms län", geocode: [{ valueName: "Län", value: "01" }] },
                null,
                { areaDesc: " " },
                {
                  areaDesc: "Sverige",
                  geocode: [
                    { valueName: "Sverige", value: "00" },
                    { valueName: "Kommun", value: 180 },
                  ],
                },
              ],
            },
          ],
        },
      ])
    )
    expect(result.records[0].info[0].area).toEqual([
      { name: "Stockholms län", geocodes: [{ type: "Län", value: "01" }] },
      { name: "Sverige", geocodes: [{ type: "Sverige", value: "00" }] },
    ])
    expect(result.issues.map((issue) => issue.field)).toEqual([
      "info[0].area[1]",
      "info[0].area[2]",
      "info[0].area[3].geocode[1]",
    ])
  })

  it.each([
    "javascript:alert(1)",
    "data:text/html,alert",
    "https://user:password@example.org",
    "/relative",
  ])("drops unsafe source links without rejecting valid text: %s", (web) => {
    const result = validateVmaResponse(feed([{ ...alert, info: [{ ...info, web }] }]))
    expect(result.records[0].info[0].web).toBeUndefined()
    expect(result.issues[0].field).toBe("info[0].web")
  })

  it("preserves a safe source link", () => {
    expect(
      validateVmaResponse(
        feed([{ ...alert, info: [{ ...info, web: "https://www.sverigesradio.se/" }] }])
      ).records[0].info[0].web
    ).toBe(source.url)
  })

  it.each(["url", "apiUrl", "apiDocumentationUrl"])(
    "rejects unsafe attribution URLs in %s",
    (field) => {
      expect(() =>
        validateVmaResponse(
          cachedResponse({ ...feedData(), source: { ...source, [field]: "javascript:alert(1)" } })
        )
      ).toThrow(VmaResponseValidationError)
    }
  )

  it("does not accept API metadata containing query values or credentials", () => {
    for (const apiUrl of [
      "https://example.org/?token=value",
      "https://user:pass@example.org/",
      "https://example.org/#secret",
    ]) {
      expect(() =>
        validateVmaResponse(cachedResponse({ ...feedData(), source: { ...source, apiUrl } }))
      ).toThrow(VmaResponseValidationError)
    }
  })

  it("does not mutate the original response or rewrite message text", () => {
    const input = feed([
      { ...alert, info: [{ ...info, description: "  Fullständig text.\n\n  " }] },
    ])
    const before = structuredClone(input)
    const result = validateVmaResponse(input)
    expect(input).toEqual(before)
    expect(result.records[0].info[0].description).toBe("  Fullständig text.\n\n  ")
    expect(result.source).not.toBe(input.data.source)
  })
})
