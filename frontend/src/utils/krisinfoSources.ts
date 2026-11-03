import type { ContentSource, VerifiedContent } from "../types/krisinfo"

/**
 * A content post as `collectSources` reads it: its own source and check date, and optionally the
 * separate page its meaning is based on, such as a signal's `meaningSource`.
 */
export type SourcedPost = VerifiedContent & { meaningSource?: ContentSource }

/**
 * One distinct source with the date it was last checked.
 *
 * @property lastVerified The oldest `lastVerified` among the posts that use the source.
 */
export interface VerifiedSource {
  source: ContentSource
  lastVerified: string
}

/**
 * Lists each distinct source once, in order of first use.
 *
 * Each post contributes its `source` and then its `meaningSource`, if any; a meaning source
 * carries the post's own `lastVerified`, because the post is checked as a whole. Sources are
 * matched by URL. A source used by several posts shows the oldest `lastVerified` among them, so
 * a page never claims a more recent check than every one of those posts has had.
 *
 * @param posts The posts in display order, typically a section's items followed by the section.
 * @returns The distinct sources in order of first use.
 */
export function collectSources(posts: readonly SourcedPost[]): VerifiedSource[] {
  const byUrl = new Map<string, VerifiedSource>()
  for (const post of posts) {
    const used = post.meaningSource ? [post.source, post.meaningSource] : [post.source]
    for (const source of used) {
      const known = byUrl.get(source.url)
      if (!known) {
        byUrl.set(source.url, { source, lastVerified: post.lastVerified })
      } else if (post.lastVerified < known.lastVerified) {
        known.lastVerified = post.lastVerified
      }
    }
  }
  return [...byUrl.values()]
}

// The content date is a calendar date, so it is formatted in UTC to avoid shifting the day.
const verifiedDateFormat = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/**
 * Formats a content check date for display, e.g. "2026-11-02" as "2 november 2026".
 *
 * @param date A `YYYY-MM-DD` calendar date.
 * @returns The Swedish long date, unaffected by the device's time zone.
 */
export function formatVerifiedDate(date: string): string {
  return verifiedDateFormat.format(new Date(`${date}T00:00:00Z`))
}
