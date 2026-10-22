/**
 * Translates MCF's shelter statustype into user-facing Swedish text, in one place.
 *
 * MCF's only observed value so far ("Skyddsrum") is already readable Swedish, not a coded
 * value - this mapping exists so a future coded value needs only an entry here, not a change
 * everywhere a shelter's type is displayed.
 */
const SHELTER_TYPE_LABELS: Record<string, string> = {
  Skyddsrum: "Skyddsrum",
}

/** Returns the readable label for a shelter type, or the raw value if it has no mapping. */
export function describeShelterType(type: string): string {
  return SHELTER_TYPE_LABELS[type] ?? type
}
