/**
 * Shortens text for display, appending an ellipsis when it exceeds maxLength.
 *
 * Only affects what is shown — never mutates or re-saves the underlying value.
 */
export function truncateForDisplay(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}
