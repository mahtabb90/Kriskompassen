import type { CrisisItem } from "../types/crisis"

/**
 * Curated local dataset of Swedish crisis preparedness information verified
 * against Krisinformation.se. Used as the frontend data source until a
 * backend API is available.
 *
 * Content is in Swedish. Each entry maps to one official hemberedskap page.
 * The `fetchedAt` timestamp records when this curated set was verified.
 */
export const mockCrisisData: CrisisItem[] = [
  {
    id: "food-in-crisis",
    title: "Mat i kris",
    description: "Ha tillräckligt med mat hemma för att hushållet ska kunna klara sig vid en kris.",
    content:
      "Ha mat hemma så att hushållet kan klara sig i minst en vecka utan att handla. " +
      "Välj mat som ger tillräckligt med energi, kan tillagas snabbt, kräver lite " +
      "vatten, kan ätas utan tillagning och kan förvaras i rumstemperatur.",
    source: "Krisinformation.se",
    sourceUrl: "https://www.krisinformation.se/forbered-dig/hemberedskap/mat-vid-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },

  {
    id: "drinking-water-in-crisis",
    title: "Dricksvatten i kris",
    description: "Förbered dricksvatten så att hushållet klarar avbrott i vattenförsörjningen.",
    content:
      "Rent dricksvatten är livsnödvändigt. Räkna med minst tre liter per vuxen och " +
      "dygn och planera gärna för tre till fem liter per person och dygn. Förvara " +
      "extra vatten i dunkar eller flaskor. Koka vattnet om det kan vara förorenat.",
    source: "Krisinformation.se",
    sourceUrl: "https://www.krisinformation.se/forbered-dig/hemberedskap/vatten-vid-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },

  {
    id: "medication-in-crisis",
    title: "Läkemedel i kris",
    description: "Ha beredskap för läkemedel och förbrukningsartiklar som behövs regelbundet.",
    content:
      "Socialstyrelsen rekommenderar en månads beredskap för personer som under " +
      "längre tid använder receptbelagda läkemedel eller förbrukningsartiklar som " +
      "skrivs ut av hälso- och sjukvården. Använd de äldsta läkemedlen först så att " +
      "de inte blir för gamla.",
    source: "Krisinformation.se",
    sourceUrl: "https://www.krisinformation.se/forbered-dig/hemberedskap/lakemedel-vid-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },

  {
    id: "heating-in-crisis",
    title: "Värme i kris",
    description:
      "Planera för hur du kan hålla dig och bostaden varm om värmen eller elen försvinner.",
    content:
      "Ha en plan för hur du kan hålla dig varm vid en kris. Täta golv, dörrar och " +
      "fönster, klä dig lager på lager och samlas gärna i ett rum. Alternativa " +
      "värmekällor kan användas, men hantera eld och bränsle försiktigt och tänk " +
      "på ventilation och brandsäkerhet.",
    source: "Krisinformation.se",
    sourceUrl: "https://www.krisinformation.se/forbered-dig/hemberedskap/varme-vid-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },

  {
    id: "communication-in-crisis",
    title: "Kommunikation i kris",
    description: "Förbered flera sätt att få viktig information och hålla kontakt under en kris.",
    content:
      "Vid en kris behöver du kunna få information om vad som händer och hur du ska " +
      "agera. Sveriges Radio P4 är en viktig informationskanal. Ha gärna en radio " +
      "som fungerar utan elnät, en papperslista med viktiga telefonnummer, " +
      "extrabatteri eller powerbank och möjlighet att ladda telefonen i bilen.",
    source: "Krisinformation.se",
    sourceUrl: "https://www.krisinformation.se/forbered-dig/hemberedskap/kommunikation-vid-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },

  {
    id: "hygiene-in-crisis",
    title: "Toalett och hygien i kris",
    description:
      "Planera för toalettbesök och personlig hygien om vattenförsörjningen slutar fungera.",
    content:
      "Om du blir utan vatten under en längre tid behöver du en plan för toalett och " +
      "hygien. Vid vattenbrist ska det vatten som finns i första hand användas till " +
      "dryck och matlagning. Det finns lösningar för toalett och tvätt som kräver " +
      "lite eller inget vatten. Följ kommunens information om hur avfall ska hanteras.",
    source: "Krisinformation.se",
    sourceUrl:
      "https://www.krisinformation.se/forbered-dig/hemberedskap/toalett-och-hygien-i-kris/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
    savedOffline: false,
  },
]
