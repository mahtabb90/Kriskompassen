import type { Shelter } from "../types/shelter"

/**
 * Describes a shelter's location in Swedish for display.
 *
 * MCF's data has no postal address, only a free-text location description (e.g. a building
 * name). This combines it with the municipality already known from the user's own resolved
 * position (never a new network call) into an honest, never-empty label - it is worded as a
 * location description, not a claim of a verified postal address.
 */
export function describeShelterLocation(
  shelter: Pick<Shelter, "address">,
  municipality?: string | null
): string {
  const address = shelter.address?.trim() || null
  const place = municipality?.trim() || null
  if (address && place) return `${address}, ${place}`
  if (address) return address
  if (place) return `Nära ${place}`
  return "Skyddsrum"
}
