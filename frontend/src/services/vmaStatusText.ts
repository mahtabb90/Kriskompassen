/**
 * Describes the request state shown alongside, or instead of, VMA content.
 *
 * At most one of loading, unavailable and stale applies: loading and unavailable mean that no
 * successful result exists, stale that a retained result may be outdated.
 */
export interface VmaStatus {
  loading: boolean
  unavailable: boolean
  stale: boolean
  offline: boolean
  uncertain: boolean
  /** The backend's last successful SR check, or null before any successful result. */
  lastCheckedAt: string | null
}

const timeZone = "Europe/Stockholm"
const dayKey = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone,
})
const clock = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone })
const dayMonth = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", timeZone })
const year = new Intl.DateTimeFormat("sv-SE", { year: "numeric", timeZone })

/**
 * Formats a check time in Swedish local time, adding the date only when it is not today.
 *
 * @param checkedAt An ISO 8601 time.
 * @param now The reference time that decides whether the check happened today.
 * @returns For example "kl. 14:05", "den 12 oktober kl. 14:05" or "den 12 oktober 2025 kl. 14:05".
 */
export function formatVmaCheckTime(checkedAt: string, now: number): string {
  const checked = new Date(checkedAt)
  const time = `kl. ${clock.format(checked)}`
  if (dayKey.format(checked) === dayKey.format(now)) return time
  const date =
    year.format(checked) === year.format(now)
      ? dayMonth.format(checked)
      : `${dayMonth.format(checked)} ${year.format(checked)}`
  return `den ${date} ${time}`
}

/**
 * Returns the Swedish status lines shared by the banner and the message dialog.
 *
 * Never states that no VMA exists. Background polling leaves the input, and therefore the text,
 * unchanged, so live regions announce only actual status changes.
 *
 * @param status The derived request state.
 * @param now The reference time for deciding whether to include the check date.
 * @returns Lines in display order; empty when there is nothing to report.
 */
export function vmaStatusLines(status: VmaStatus, now: number = Date.now()): string[] {
  const lines: string[] = []
  if (status.loading) {
    lines.push("Kontrollerar VMA…")
  } else if (status.unavailable) {
    lines.push("VMA-information inte tillgänglig.")
  } else if (status.stale) {
    lines.push(
      status.lastCheckedAt
        ? "VMA-informationen kan vara inaktuell. Senast kontrollerad " +
            `${formatVmaCheckTime(status.lastCheckedAt, now)}.`
        : "VMA-informationen kan vara inaktuell."
    )
  }
  if (status.offline && (status.unavailable || status.stale)) {
    lines.push("Ingen internetanslutning.")
  }
  if (status.uncertain) lines.push("VMA-informationen kan vara ofullständig.")
  return lines
}
