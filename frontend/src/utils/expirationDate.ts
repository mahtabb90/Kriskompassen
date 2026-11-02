export type ExpirationStatus = "expired" | "soon" | "ok"

const DEFAULT_WARNING_DAYS = 30

function parseDate(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
  const parsedDate = new Date(timestamp)

  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    return null
  }

  return timestamp
}

export function getExpirationStatus(
  expirationDate: string | undefined,
  today: string,
  warningDays = DEFAULT_WARNING_DAYS
): ExpirationStatus | null {
  if (!expirationDate) {
    return null
  }

  const expirationTimestamp = parseDate(expirationDate)
  const todayTimestamp = parseDate(today)

  if (expirationTimestamp === null || todayTimestamp === null) {
    return null
  }

  if (expirationTimestamp < todayTimestamp) {
    return "expired"
  }

  const daysUntilExpiration = (expirationTimestamp - todayTimestamp) / (24 * 60 * 60 * 1000)

  return daysUntilExpiration <= warningDays ? "soon" : "ok"
}

export function formatExpirationDate(date: string): string {
  const timestamp = parseDate(date)

  if (timestamp === null) {
    return date
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp)
}
