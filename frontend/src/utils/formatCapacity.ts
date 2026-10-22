const CAPACITY_FORMATTER = new Intl.NumberFormat("sv-SE")

/** Formats a shelter's capacity in Swedish, e.g. "1 200 platser". */
export function formatShelterCapacity(capacity: number): string {
  return `${CAPACITY_FORMATTER.format(capacity)} platser`
}
