import { describe, expect, it } from "vitest"
import { crisisArticles } from "./__fixtures__/crisis"
import {
  CrisisResponseValidationError,
  isSafeCrisisSourceUrl,
  validateCrisisArticle,
  validateCrisisArticles,
} from "./crisisResponseValidator"

const article = crisisArticles[0]

describe("article response validation", () => {
  it("preserves full text, source order and the original compilation time", () => {
    expect(validateCrisisArticles(crisisArticles)).toEqual(crisisArticles)
    expect(validateCrisisArticles([])).toEqual([])
  })

  it("copies only article fields and discards remotely supplied device metadata", () => {
    expect(
      validateCrisisArticle({ ...article, savedOffline: true, savedAt: "remote", extra: 1 })
    ).toEqual(article)
  })

  it("accepts an omitted source link", () => {
    expect(validateCrisisArticle(crisisArticles[1])).toEqual(crisisArticles[1])
    expect(validateCrisisArticle(crisisArticles[1])).not.toHaveProperty("sourceUrl")
  })

  it.each([undefined, null, {}, "articles", [null], [article, { id: "broken" }]])(
    "rejects a malformed list rather than returning a partial or empty result: %j",
    (payload) => {
      expect(() => validateCrisisArticles(payload)).toThrow(CrisisResponseValidationError)
    }
  )

  it.each([
    ["id", ""],
    ["id", "../other"],
    ["id", "test-article\n"],
    ["title", 123],
    ["title", "  "],
    ["description", null],
    ["content", "\n"],
    ["source", ""],
    ["sourceUrl", null],
    ["sourceUrl", "javascript:alert(1)"],
    ["fetchedAt", "2026-02-30T15:04:37.079Z"],
    ["fetchedAt", "0000-01-01T00:00:00.000Z"],
    ["fetchedAt", "2026-09-28T15:04:37.079"],
    ["fetchedAt", 123],
  ])("rejects invalid %s=%j", (field, value) => {
    expect(() => validateCrisisArticle({ ...article, [field as string]: value })).toThrow(
      CrisisResponseValidationError
    )
  })

  it.each([null, [], 1])("rejects non-object articles: %j", (payload) => {
    expect(() => validateCrisisArticle(payload)).toThrow(CrisisResponseValidationError)
  })

  it("rejects duplicate IDs even when their other content differs", () => {
    expect(() => validateCrisisArticles([article, { ...article, title: "Annan titel" }])).toThrow(
      CrisisResponseValidationError
    )
  })
})

describe("source-link safety", () => {
  it.each([
    undefined,
    null,
    "/relative",
    "javascript:alert(1)",
    "data:text/html,test",
    "https:example.com",
    "https://user:password@example.com/",
    "https://example.com:bad/",
    "https://example.com/\n",
    "https://example.com\\other",
    "https://",
  ])("rejects unsafe source links: %j", (value) => {
    expect(isSafeCrisisSourceUrl(value)).toBe(false)
  })

  it.each(["https://example.com/article/?q=1#section", "http://example.com/"])(
    "accepts a public HTTP(S) source: %s",
    (value) => {
      expect(isSafeCrisisSourceUrl(value)).toBe(true)
    }
  )
})
