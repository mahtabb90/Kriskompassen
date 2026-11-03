/** Which decorative icon a krisinfo overview card shows; `KrisinfoSectionCard` draws it. */
export type KrisinfoSectionIcon = "info" | "phone" | "signal" | "calm"

export interface KrisinfoSection {
  /** Stable slug, used for element ids. */
  id: string
  to: string
  label: string
  description: string
  icon: KrisinfoSectionIcon
}

/**
 * The parts of the krisinfo overview, in display order.
 *
 * Add a new part here and register its route in App.tsx. The icon is a key rather than an
 * element, so this list stays plain data.
 */
export const krisinfoSections: readonly KrisinfoSection[] = [
  {
    id: "innan-krisen",
    to: "/crisis",
    label: "Innan krisen",
    description:
      "Råd om hur du förbereder dig och vad du gör vid olika händelser. Spara artiklar för att läsa dem utan internet.",
    icon: "info",
  },
  {
    id: "telefonnummer",
    to: "/telefonnummer",
    label: "Telefonnummer",
    description:
      "Nummer att ringa vid fara, när du behöver vård eller råd och när du vill ha information om en händelse.",
    icon: "phone",
  },
  {
    id: "utomhusvarning",
    to: "/varningssignaler",
    label: "Utomhusvarning",
    description:
      "Vad Hesa Fredriks signaler betyder, vad du ska göra när du hör dem och länkar till ljuden hos MCF.",
    icon: "signal",
  },
  {
    id: "lugn-i-kris",
    to: "/lugn-i-kris",
    label: "Lugn i kris",
    description:
      "Några enkla steg som kan hjälpa dig att hantera oro och tänka klart när det är svårt.",
    icon: "calm",
  },
]
