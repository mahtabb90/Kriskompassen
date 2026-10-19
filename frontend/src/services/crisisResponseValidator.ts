import type { CrisisArticle } from "../types/crisis"

/** Identifies article data that cannot be displayed or saved safely. */
export class CrisisResponseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CrisisResponseValidationError"
  }
}

/** Accepts absolute HTTP(S) source links without credentials, whitespace or backslashes. */
export function isSafeCrisisSourceUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^https?:\/\//i.test(value) ||
    /[\s\\]/.test(value) ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  )
    return false
  try {
    const url = new URL(value)
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

function isCompilationTime(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.startsWith("0000-") ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false
  }
  const timestamp = new Date(value)
  return Number.isFinite(timestamp.getTime()) && timestamp.toISOString() === value
}

/**
 * Validates one API article and copies only public content fields, discarding extra metadata.
 *
 * @throws {CrisisResponseValidationError} For malformed content, IDs, dates or source links.
 */
export function validateCrisisArticle(payload: unknown): CrisisArticle {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new CrisisResponseValidationError("The article is not an object.")
  }
  const record = payload as Record<string, unknown>
  const { id, title, description, content, source, sourceUrl, fetchedAt } = record
  if (
    typeof id !== "string" ||
    !id ||
    /[^A-Za-z0-9_-]/.test(id) ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof content !== "string" ||
    !content.trim() ||
    typeof source !== "string" ||
    !source.trim() ||
    !isCompilationTime(fetchedAt) ||
    (sourceUrl !== undefined && !isSafeCrisisSourceUrl(sourceUrl))
  ) {
    throw new CrisisResponseValidationError("The article has invalid or missing fields.")
  }
  return {
    id,
    title,
    description,
    content,
    source,
    ...(sourceUrl !== undefined ? { sourceUrl } : {}),
    fetchedAt,
  }
}

/**
 * Validates a complete article list in source order; an empty array is a valid result.
 *
 * @throws {CrisisResponseValidationError} For an invalid list, any malformed item or duplicate ID.
 */
export function validateCrisisArticles(payload: unknown): CrisisArticle[] {
  if (!Array.isArray(payload)) {
    throw new CrisisResponseValidationError("The article list is not an array.")
  }
  const articles = payload.map(validateCrisisArticle)
  if (new Set(articles.map((article) => article.id)).size !== articles.length) {
    throw new CrisisResponseValidationError("The article list contains duplicate IDs.")
  }
  return articles
}
