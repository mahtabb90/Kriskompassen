import type { ValidatedVmaRecord, VmaMessage, VmaReference, VmaSource } from "../types/vma"

/**
 * Maps one validated Actual/Public record without inventing missing cancellation content.
 *
 * Keeps all Swedish info blocks and original text. An expired message is no longer usable as an
 * active warning; this does not claim that the underlying incident has ended. Mixed expiry or a
 * future sent time yields unknown. Status is a snapshot at the supplied time.
 *
 * @param record A validated SR alert, update or cancellation.
 * @param source Backend-supplied provider and API attribution.
 * @param evaluatedAt Epoch milliseconds used for deterministic validity checks.
 * @returns A fresh presentation model, with no mutable objects shared with its inputs.
 */
export function mapVmaMessage(
  record: ValidatedVmaRecord,
  source: VmaSource,
  evaluatedAt: number
): VmaMessage {
  const details = structuredClone(record.info)
  const expired = details.map((info) => Date.parse(info.expires) <= evaluatedAt)
  const future = Date.parse(record.sent) > evaluatedAt
  const cancelled = record.msgType === "Cancel"
  const allExpired = expired.length > 0 && expired.every(Boolean)
  return {
    id: record.identifier,
    incidentIds: [...record.incidents],
    messageType: record.msgType,
    title: details.length ? [...new Set(details.map((info) => info.event))].join(" / ") : undefined,
    content: details.length
      ? details
          .map((info) => [info.description, info.instruction].filter(Boolean).join("\n\n"))
          .join("\n\n")
      : undefined,
    source: { ...source },
    sender: record.sender,
    sentAt: record.sent,
    references: record.references.map((reference) => ({ ...reference })),
    details,
    areas: structuredClone(details.flatMap((info) => info.area)),
    links: details.flatMap((info) =>
      info.web ? [{ label: "Mer information hos Sveriges Radio", url: info.web }] : []
    ),
    status: future
      ? "unknown"
      : cancelled || allExpired
        ? "inactive"
        : expired.some(Boolean)
          ? "unknown"
          : "active",
    inactiveReason: future
      ? undefined
      : cancelled
        ? "cancelled"
        : allExpired
          ? "expired"
          : undefined,
  }
}

function referenceKey(reference: VmaReference): string {
  return JSON.stringify([reference.sender, reference.identifier, reference.sent])
}

/**
 * Applies CAP Update/Cancel references to messages present in the same response.
 *
 * Uses complete reference tuples, not incident IDs or response order. No previous feed is retained;
 * standalone cancellations still reach consumers with their references. Missing optional references
 * cannot be used to infer which prior messages ended. Future messages cannot supersede current ones.
 *
 * @param records Validated SR records from one feed.
 * @param source Provider and API attribution for every returned message.
 * @param evaluatedAt Epoch milliseconds at which validity is evaluated.
 * @returns Messages including inactive versions and cancellations; callers select what to display.
 */
export function mapVmaMessages(
  records: ValidatedVmaRecord[],
  source: VmaSource,
  evaluatedAt: number
): VmaMessage[] {
  const replacements = new Map<string, "cancelled" | "superseded">()
  for (const record of records) {
    if (record.msgType === "Alert" || Date.parse(record.sent) > evaluatedAt) continue
    for (const reference of record.references) {
      if (Date.parse(reference.sent) > Date.parse(record.sent)) continue
      const key = referenceKey(reference)
      if (record.msgType === "Cancel" || !replacements.has(key)) {
        replacements.set(key, record.msgType === "Cancel" ? "cancelled" : "superseded")
      }
    }
  }
  return records.map((record) => {
    const message = mapVmaMessage(record, source, evaluatedAt)
    const reason = replacements.get(referenceKey(record))
    if (reason && message.messageType !== "Cancel") {
      message.status = "inactive"
      message.inactiveReason = reason
    }
    return message
  })
}

/**
 * Re-evaluates a complete mapped feed using the same CAP rules as the initial mapping.
 *
 * The shared model retains all fields needed to rebuild validated records. Keeping the entire
 * feed allows future Update/Cancel references to take effect without resurrecting older warnings.
 * This changes local validity only; it does not fetch new information or confirm incident safety.
 *
 * @param messages All mapped messages from one response, including inactive and unknown records.
 * @param source Attribution from that response.
 * @param evaluatedAt Epoch milliseconds at which validity is evaluated.
 * @returns Fresh messages with updated validity and the original source content.
 */
export function reevaluateVmaMessages(
  messages: VmaMessage[],
  source: VmaSource,
  evaluatedAt: number
): VmaMessage[] {
  const records = messages.map((message): ValidatedVmaRecord => ({
    identifier: message.id,
    incidents: message.incidentIds,
    sender: message.sender,
    sent: message.sentAt,
    msgType: message.messageType,
    references: message.references,
    info: message.details,
  }))
  return mapVmaMessages(records, source, evaluatedAt)
}
