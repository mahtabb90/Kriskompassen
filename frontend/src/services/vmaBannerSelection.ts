import type { VmaMessage, VmaResult } from "../types/vma"

/** Selects warnings without treating incomplete data as verified absence of VMA. */
export interface VmaBannerSelection {
  /** The first entry of activeMessages, or null when none can be displayed. */
  message: VmaMessage | null
  /** Contains every displayable active message once, in compareVmaMessages order. */
  activeMessages: VmaMessage[]
  hasMore: boolean
  uncertain: boolean
}

/**
 * Orders VMA messages for presentation: newest CAP sentAt first, then ascending CAP ID.
 *
 * This is the single place that defines the display order of the banner and its message list.
 * A later change can rank messages by local relevance here without touching the components.
 * Equal results keep feed order because Array.prototype.sort is stable.
 *
 * @param a A message to compare.
 * @param b Another message to compare.
 * @returns A negative number when a comes first, a positive number when b comes first, else 0.
 */
export function compareVmaMessages(a: VmaMessage, b: VmaMessage): number {
  const sentOrder = Date.parse(b.sentAt) - Date.parse(a.sentAt)
  return sentOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/**
 * Selects the active messages in display order, keeping one entry per CAP ID.
 *
 * A repeated CAP ID keeps the copy that compareVmaMessages ranks first, then the first in feed
 * order. Repeated IDs with differing content cannot be reconciled, so they mark the data as
 * uncertain instead of silently trusting one copy.
 *
 * @param result A validated feed with validity already evaluated at the desired time.
 * @returns The ordered active messages, the first of them, whether more exist and uncertainty.
 */
export function selectVmaBanner(result: VmaResult | null): VmaBannerSelection {
  if (!result) return { message: null, activeMessages: [], hasMore: false, uncertain: false }

  const seen = new Set<string>()
  const activeMessages = result.messages
    .filter((message) => message.status === "active" && message.title?.trim())
    .sort(compareVmaMessages)
    .filter((message) => {
      if (seen.has(message.id)) return false
      seen.add(message.id)
      return true
    })

  const copiesById = new Map<string, string>()
  const conflictingCopies = result.messages.some((message) => {
    const copy = JSON.stringify(message)
    const previous = copiesById.get(message.id)
    copiesById.set(message.id, previous ?? copy)
    return previous !== undefined && previous !== copy
  })

  return {
    message: activeMessages[0] ?? null,
    activeMessages,
    hasMore: activeMessages.length > 1,
    uncertain:
      conflictingCopies ||
      result.rejectedCount > 0 ||
      result.excludedCount > 0 ||
      result.issues.length > 0 ||
      result.messages.some(
        (message) =>
          message.status === "unknown" || (message.status === "active" && !message.title?.trim())
      ),
  }
}
