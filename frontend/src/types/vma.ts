/** Describes validity at evaluation time; unknown must never be labelled active. */
export type VmaStatus = "active" | "inactive" | "unknown"

/** Carries provider and API attribution supplied by our backend, even for an empty feed. */
export interface VmaSource {
  name: string
  url: string
  apiName: string
  apiVersion: string
  apiDocumentationUrl: string
  /** Contains the upstream endpoint without credentials, query parameters or fragments. */
  apiUrl: string
}

/** Preserves SCB codes as strings, including leading zeroes. */
export interface VmaGeocode {
  type: "Kommun" | "Län" | "Sverige"
  value: string
}

/** Describes an affected area; an empty array does not imply nationwide coverage. */
export interface VmaArea {
  name: string
  geocodes: VmaGeocode[]
}

/** Provides a validated HTTP(S) link whose label remains untrusted display text. */
export interface VmaLink {
  label: string
  url: string
}

/** Identifies an earlier CAP message by the complete sender, identifier and sent tuple. */
export interface VmaReference {
  sender: string
  identifier: string
  sent: string
}

/** Preserves a Swedish CAP info block without rewriting its message or instructions. */
export interface ValidatedVmaInfo {
  event: string
  description: string
  instruction?: string
  language: string
  senderName: string
  expires: string
  web?: string
  area: VmaArea[]
}

/** Keeps validated Actual/Public CAP records separate from presentation and lifecycle mapping. */
export interface ValidatedVmaRecord {
  identifier: string
  incidents: string[]
  sender: string
  sent: string
  msgType: "Alert" | "Update" | "Cancel"
  references: VmaReference[]
  /** Is empty for a cancellation, which can legitimately have info: null. */
  info: ValidatedVmaInfo[]
}

/**
 * Supplies the shared model for VMA presentation.
 *
 * id identifies a CAP message, while incidentIds connect revisions of an incident. Cancellation
 * records have no fabricated title or content; use references to associate earlier messages.
 * Text must be rendered as text, never HTML. Times are ISO 8601 UTC strings. Status is evaluated
 * when the feed is mapped; consumers can re-evaluate the complete feed at later times. Each info
 * block retains its own expiry and area.
 */
export interface VmaMessage {
  id: string
  incidentIds: string[]
  messageType: ValidatedVmaRecord["msgType"]
  title?: string
  content?: string
  source: VmaSource
  sender: string
  sentAt: string
  references: VmaReference[]
  details: ValidatedVmaInfo[]
  areas: VmaArea[]
  links: VmaLink[]
  status: VmaStatus
  inactiveReason?: "cancelled" | "superseded" | "expired"
}

/** Identifies malformed data without putting upstream message text in diagnostics. */
export interface VmaValidationIssue {
  /** Uses -1 for feed-level fields, otherwise the original alerts array index. */
  index: number
  field: string
  code: "invalid_record" | "invalid_required_field" | "invalid_optional_field"
}

/**
 * Keeps provenance and feed time alongside usable records and partial-data diagnostics.
 *
 * excludedCount counts non-public/non-Actual, non-display message types and non-Swedish records.
 * A non-empty feed containing only malformed records throws; exclusions are not validation errors.
 */
export interface VmaValidationResult {
  source: VmaSource
  feedUpdatedAt: string
  records: ValidatedVmaRecord[]
  issues: VmaValidationIssue[]
  rejectedCount: number
  excludedCount: number
}

/** Includes cancellations and inactive records; banners must explicitly select active messages. */
export interface VmaResult extends Omit<VmaValidationResult, "records"> {
  messages: VmaMessage[]
  evaluatedAt: string
}

export type VmaRequestErrorCode = "network" | "http" | "timeout" | "invalid_json"
