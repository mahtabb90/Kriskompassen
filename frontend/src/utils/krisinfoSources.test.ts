import { describe, expect, it } from "vitest"
import { collectSources, formatVerifiedDate, type SourcedPost } from "./krisinfoSources"

// Synthetic posts, so these tests cover the ordering and date rules. The bundled content's
// sources are pinned by the content and page tests.
const a = { name: "Källa A", url: "https://example.org/a" }
const b = { name: "Källa B", url: "https://example.org/b" }
const c = { name: "Källa C", url: "https://example.org/c" }

function post(source: typeof a, lastVerified: string, meaningSource?: typeof a): SourcedPost {
  return meaningSource ? { source, lastVerified, meaningSource } : { source, lastVerified }
}

describe("collectSources", () => {
  it("lists each source once, in order of first use", () => {
    const sources = collectSources([
      post(b, "2026-11-02"),
      post(a, "2026-11-02"),
      post(b, "2026-11-02"),
    ])
    expect(sources.map(({ source }) => source.url)).toEqual([b.url, a.url])
  })

  it("keeps the oldest check date among the posts that use a source", () => {
    const sources = collectSources([
      post(a, "2026-11-02"),
      post(a, "2026-10-15"),
      post(a, "2026-10-30"),
    ])
    expect(sources).toEqual([{ source: a, lastVerified: "2026-10-15" }])
  })

  it("lists a meaning source right after its post's own source, with the post's date", () => {
    const sources = collectSources([post(a, "2026-11-01", c), post(b, "2026-11-02")])
    expect(sources).toEqual([
      { source: a, lastVerified: "2026-11-01" },
      { source: c, lastVerified: "2026-11-01" },
      { source: b, lastVerified: "2026-11-02" },
    ])
  })

  it("merges a meaning source with the same page used as a post source", () => {
    const sources = collectSources([post(a, "2026-11-02", b), post(b, "2026-10-01")])
    expect(sources).toEqual([
      { source: a, lastVerified: "2026-11-02" },
      { source: b, lastVerified: "2026-10-01" },
    ])
  })

  it("does not change the posts it reads", () => {
    const posts = [post(a, "2026-11-02"), post(a, "2026-10-01")]
    collectSources(posts)
    expect(posts.map((item) => item.lastVerified)).toEqual(["2026-11-02", "2026-10-01"])
  })
})

describe("formatVerifiedDate", () => {
  it("formats a calendar date as a Swedish long date", () => {
    expect(formatVerifiedDate("2026-11-02")).toBe("2 november 2026")
  })

  it("keeps the first and last day of the year on their own day", () => {
    expect(formatVerifiedDate("2026-01-01")).toBe("1 januari 2026")
    expect(formatVerifiedDate("2026-12-31")).toBe("31 december 2026")
  })
})
