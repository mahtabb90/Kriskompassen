import type {
  ValidatedVmaInfo,
  ValidatedVmaRecord,
  VmaArea,
  VmaGeocode,
  VmaReference,
  VmaSource,
  VmaValidationIssue,
  VmaValidationResult,
} from "../types/vma"

/** Distinguishes an invalid response from a successful empty feed and from transport failures. */
export class VmaResponseValidationError extends Error {
  readonly issues: VmaValidationIssue[]

  constructor(issues: VmaValidationIssue[] = []) {
    super("The VMA response must contain source metadata, a timestamp and a usable alerts array.")
    this.name = "VmaResponseValidationError"
    this.issues = issues
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function optionalText(
  value: unknown,
  index: number,
  field: string,
  issues: VmaValidationIssue[]
): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === "string") return value.trim() ? value : undefined
  issues.push({ index, field, code: "invalid_optional_field" })
  return undefined
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  try {
    const url = new URL(value)
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      return undefined
    }
    return url.href
  } catch {
    return undefined
  }
}

function timestamp(value: unknown): string | undefined {
  const text = nonEmptyText(value)
  if (!text) return undefined
  // Date.parse alone normalizes invalid dates such as February 30 and guesses missing timezones.
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.exec(text)
  if (!parts) return undefined
  const [, year, month, day, hour, minute, second, zone] = parts
  const leapYear = +year % 4 === 0 && (+year % 100 !== 0 || +year % 400 === 0)
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const validZone = zone.toUpperCase() === "Z" || (+zone.slice(1, 3) <= 23 && +zone.slice(4) <= 59)
  const parsed = Date.parse(text)
  return +month >= 1 &&
    +month <= 12 &&
    +day >= 1 &&
    +day <= monthDays[+month - 1] &&
    +hour <= 23 &&
    +minute <= 59 &&
    +second <= 59 &&
    validZone &&
    Number.isFinite(parsed)
    ? new Date(parsed).toISOString()
    : undefined
}

function sourceMetadata(value: unknown): VmaSource | undefined {
  if (!isObject(value)) return undefined
  const name = nonEmptyText(value.name)
  const apiName = nonEmptyText(value.apiName)
  const apiVersion = nonEmptyText(value.apiVersion)
  const url = httpUrl(value.url)
  const apiDocumentationUrl = httpUrl(value.apiDocumentationUrl)
  const apiUrl = httpUrl(value.apiUrl)
  if (!name || !apiName || !apiVersion || !url || !apiDocumentationUrl || !apiUrl) return undefined
  if (new URL(apiUrl).search || new URL(apiUrl).hash) return undefined
  return { name, apiName, apiVersion, url, apiDocumentationUrl, apiUrl }
}

function validateAreas(
  value: unknown,
  index: number,
  field: string,
  issues: VmaValidationIssue[]
): VmaArea[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    issues.push({ index, field, code: "invalid_optional_field" })
    return []
  }
  const areas: VmaArea[] = []
  value.forEach((item: unknown, areaIndex) => {
    const path = `${field}[${areaIndex}]`
    if (!isObject(item) || !nonEmptyText(item.areaDesc)) {
      issues.push({ index, field: path, code: "invalid_optional_field" })
      return
    }
    const geocodes: VmaGeocode[] = []
    if (item.geocode != null && !Array.isArray(item.geocode)) {
      issues.push({ index, field: `${path}.geocode`, code: "invalid_optional_field" })
    } else if (Array.isArray(item.geocode)) {
      item.geocode.forEach((code: unknown, codeIndex) => {
        if (isObject(code) && typeof code.value === "string") {
          const type = code.valueName
          const valid =
            (type === "Kommun" && /^\d{4}$/.test(code.value)) ||
            (type === "Län" && /^\d{2}$/.test(code.value) && code.value !== "00") ||
            (type === "Sverige" && code.value === "00")
          if (valid) {
            geocodes.push({ type: type as VmaGeocode["type"], value: code.value })
            return
          }
        }
        issues.push({
          index,
          field: `${path}.geocode[${codeIndex}]`,
          code: "invalid_optional_field",
        })
      })
    }
    areas.push({ name: nonEmptyText(item.areaDesc)!, geocodes })
  })
  return areas
}

function validateReferences(
  value: unknown,
  index: number,
  issues: VmaValidationIssue[]
): VmaReference[] {
  const text = optionalText(value, index, "references", issues)
  if (!text) return []
  const references: VmaReference[] = []
  text
    .trim()
    .split(/\s+/)
    .forEach((entry) => {
      const parts = entry.split(",")
      const sent = timestamp(parts[2])
      if (parts.length !== 3 || !parts[0] || !parts[1] || !sent) {
        issues.push({ index, field: "references", code: "invalid_optional_field" })
        return
      }
      references.push({ sender: parts[0], identifier: parts[1], sent })
    })
  return references
}

function validateInfo(
  value: unknown,
  index: number,
  issues: VmaValidationIssue[]
): { info: ValidatedVmaInfo[]; excluded: boolean } {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ index, field: "info", code: "invalid_required_field" })
    return { info: [], excluded: false }
  }
  const info: ValidatedVmaInfo[] = []
  let malformed = false
  value.forEach((item: unknown, infoIndex) => {
    const field = `info[${infoIndex}]`
    if (!isObject(item) || !nonEmptyText(item.language)) {
      issues.push({ index, field, code: "invalid_record" })
      malformed = true
      return
    }
    // The product is Swedish-only; keep all Swedish blocks and never substitute a translation.
    if (String(item.language).toLowerCase() !== "sv-se") return
    const event = nonEmptyText(item.event)
    const description = nonEmptyText(item.description)
    const senderName = nonEmptyText(item.senderName)
    const expires = timestamp(item.expires)
    for (const [key, content] of Object.entries({ event, description, senderName, expires })) {
      if (!content) issues.push({ index, field: `${field}.${key}`, code: "invalid_required_field" })
    }
    if (!event || !description || !senderName || !expires) {
      malformed = true
      return
    }
    const webText = optionalText(item.web, index, `${field}.web`, issues)
    const web = webText ? httpUrl(webText) : undefined
    if (webText && !web)
      issues.push({ index, field: `${field}.web`, code: "invalid_optional_field" })
    info.push({
      event,
      description: item.description as string,
      senderName,
      expires,
      language: "sv-SE",
      instruction: optionalText(item.instruction, index, `${field}.instruction`, issues),
      web,
      area: validateAreas(item.area, index, `${field}.area`, issues),
    })
  })
  return { info, excluded: info.length === 0 && !malformed }
}

/**
 * Validates our backend's SR envelope and public Swedish CAP records independently.
 *
 * Excludes technical tests, exercises, drafts, private/restricted records and Ack/Error messages.
 * Preserves valid peers, optional-field diagnostics and Cancel records with no info block.
 * This validates the consumed SR subset, not every field in the complete CAP standard.
 *
 * @param response Decoded JSON from our backend, including backend-supplied source metadata.
 * @returns Validated records, feed time, provenance and diagnostics without mutating the input.
 * @throws {VmaResponseValidationError} For an invalid envelope or only malformed records.
 */
export function validateVmaResponse(response: unknown): VmaValidationResult {
  const source = isObject(response) ? sourceMetadata(response.source) : undefined
  const feedUpdatedAt = isObject(response) ? timestamp(response.timestamp) : undefined
  if (!isObject(response) || !Array.isArray(response.alerts) || !source || !feedUpdatedAt) {
    throw new VmaResponseValidationError()
  }
  const records: ValidatedVmaRecord[] = []
  const issues: VmaValidationIssue[] = []
  let rejectedCount = 0
  let excludedCount = 0
  response.alerts.forEach((item: unknown, index) => {
    if (!isObject(item)) {
      issues.push({ index, field: "$", code: "invalid_record" })
      rejectedCount++
      return
    }
    const identifier = nonEmptyText(item.identifier)
    const sender = nonEmptyText(item.sender)
    const incidents = nonEmptyText(item.incidents)
    const sent = timestamp(item.sent)
    const status =
      typeof item.status === "string" &&
      ["Actual", "Exercise", "System", "Test", "Draft"].includes(item.status)
        ? item.status
        : undefined
    const scope =
      typeof item.scope === "string" && ["Public", "Restricted", "Private"].includes(item.scope)
        ? item.scope
        : undefined
    const msgType =
      typeof item.msgType === "string" &&
      ["Alert", "Update", "Cancel", "Ack", "Error"].includes(item.msgType)
        ? item.msgType
        : undefined
    for (const [field, value] of Object.entries({
      identifier,
      sender,
      incidents,
      sent,
      status,
      scope,
      msgType,
    })) {
      if (!value) issues.push({ index, field, code: "invalid_required_field" })
    }
    if (!identifier || !sender || !incidents || !sent || !status || !scope || !msgType) {
      rejectedCount++
      return
    }
    if (
      status !== "Actual" ||
      scope !== "Public" ||
      (msgType !== "Alert" && msgType !== "Update" && msgType !== "Cancel")
    ) {
      excludedCount++
      return
    }
    const references = validateReferences(item.references, index, issues)
    const result =
      msgType === "Cancel" ? { info: [], excluded: false } : validateInfo(item.info, index, issues)
    if (result.excluded) {
      excludedCount++
      return
    }
    if (msgType !== "Cancel" && result.info.length === 0) {
      rejectedCount++
      return
    }
    records.push({
      identifier,
      sender,
      incidents: incidents.split(/\s+/),
      sent,
      msgType,
      references,
      info: result.info,
    })
  })
  if (response.alerts.length > 0 && rejectedCount === response.alerts.length) {
    throw new VmaResponseValidationError(issues)
  }
  return { source, feedUpdatedAt, records, issues, rejectedCount, excludedCount }
}
