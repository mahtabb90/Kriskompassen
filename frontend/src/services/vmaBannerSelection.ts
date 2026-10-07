import type { VmaMessage, VmaResult } from "../types/vma"

/** Selects one warning without treating incomplete data as verified absence of VMA. */
export interface VmaBannerSelection {
  message: VmaMessage | null
  hasMore: boolean
  uncertain: boolean
}

/**
 * Selects the newest active message, breaking equal sent times by ascending CAP ID.
 *
 * @param result A validated feed with validity already evaluated at the desired time.
 * @returns One message, an indication of additional active messages and data uncertainty.
 */
export function selectVmaBanner(result: VmaResult | null): VmaBannerSelection {
  if (!result) return { message: null, hasMore: false, uncertain: false }

  const active = result.messages
    .filter((message) => message.status === "active" && message.title?.trim())
    .sort((a, b) => {
      const sentOrder = Date.parse(b.sentAt) - Date.parse(a.sentAt)
      return sentOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    })

  return {
    message: active[0] ?? null,
    hasMore: active.length > 1,
    uncertain:
      result.rejectedCount > 0 ||
      result.excludedCount > 0 ||
      result.issues.length > 0 ||
      result.messages.some(
        (message) =>
          message.status === "unknown" || (message.status === "active" && !message.title?.trim())
      ),
  }
}
