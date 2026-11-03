// An optional leading plus, then groups of digits separated by a single space or hyphen.
const DISPLAY_NUMBER = /^\+?\d+(?:[ -]\d+)*$/

/**
 * Builds a `tel:` link from a phone number written for display.
 *
 * Spaces and hyphens are dropped so the dialler gets digits only, as in "113 13" → "tel:11313"
 * and "020-22 11 44" → "tel:020221144". A leading `+` is kept, so an international number such
 * as "+46 77 33 113 13" becomes "tel:+46773311313"; a domestic number is never converted to
 * international format.
 *
 * @param number The number as it is displayed, optionally surrounded by whitespace.
 * @returns The `tel:` URL for an `href`.
 * @throws {RangeError} If the number is not digit groups separated by single spaces or
 * hyphens with an optional leading `+`, for example when it is empty or has a `+` elsewhere.
 * The content tests run every bundled number through this function, so a malformed number
 * fails the tests instead of becoming a broken link.
 */
export function toTelHref(number: string): string {
  const trimmed = number.trim()
  if (!DISPLAY_NUMBER.test(trimmed)) {
    throw new RangeError(`Not a valid phone number for a tel: link: "${number}"`)
  }
  return `tel:${trimmed.replace(/[ -]/g, "")}`
}
