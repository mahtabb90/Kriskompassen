import type { CrisisItem } from "../db/db"

export const mockCrisisData: CrisisItem[] = [
  {
    id: "important-numbers",
    title: "Viktiga telefonnummer",
    description: "Räddningstjänst, sjukvård och andra viktiga nummer.",
    content: "112 – akut hjälp",
    source: "KrisKompassen demo",
    fetchedAt: new Date().toISOString(),
    savedOffline: false,
  },

  {
    id: "first-aid",
    title: "Första hjälpen",
    description: "Instruktioner som kan rädda liv.",
    content: "Kontrollera medvetande och andning...",
    source: "KrisKompassen demo",
    fetchedAt: new Date().toISOString(),
    savedOffline: false,
  },

  {
    id: "shelters",
    title: "Närmaste skyddsrum",
    description: "Information om skyddsrum.",
    content: "Här visas information om närliggande skyddsrum.",
    source: "KrisKompassen demo",
    fetchedAt: new Date().toISOString(),
    savedOffline: false,
  },

  {
    id: "checklist",
    title: "Checklista vid kris",
    description: "Viktiga steg och förberedelser.",
    content: "Vatten, mat, radio, batterier och läkemedel.",
    source: "KrisKompassen demo",
    fetchedAt: new Date().toISOString(),
    savedOffline: false,
  },
]