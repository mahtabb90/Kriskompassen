import { apiConfig } from "../../config/apiConfig"
import type { CrisisArticle, CrisisItem } from "../../types/crisis"

/** Synthetic article content for transport and component tests; never an application data source. */
export const crisisArticles: CrisisArticle[] = [
  {
    id: "food-in-crisis",
    title: "Mat i kris",
    description: "Sammanfattning för den första testartikeln.",
    content: "Första teststycket.\n\nAndra teststycket med å, ä och ö.",
    source: "Testkälla",
    sourceUrl: "https://example.com/food/",
    fetchedAt: "2026-09-28T15:04:37.079Z",
  },
  {
    id: "drinking-water-in-crisis",
    title: "Dricksvatten i kris",
    description: "Sammanfattning för den andra testartikeln.",
    content: "Andra artikelns fullständiga testinnehåll.",
    source: "Testkälla",
    fetchedAt: "2026-09-28T15:04:37.079Z",
  },
  {
    id: "medication-in-crisis",
    title: "Läkemedel i kris",
    description: "Sammanfattning för den tredje testartikeln.",
    content: "Tredje artikelns fullständiga testinnehåll.",
    source: "Testkälla",
    fetchedAt: "2026-09-28T15:04:37.079Z",
  },
]

export const crisisItems: CrisisItem[] = crisisArticles.map((article) => ({
  ...article,
  savedOffline: false,
}))

/** Resolves only article API URLs; unexpected calls fail instead of returning unrelated data. */
export function crisisResponse(input: RequestInfo | URL): Response {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  if (url === apiConfig.crisisUrl) return Response.json(crisisArticles)
  if (!url.startsWith(`${apiConfig.crisisUrl}/`)) throw new Error(`Unexpected test request: ${url}`)
  const id = decodeURIComponent(url.slice(apiConfig.crisisUrl.length + 1))
  const article = crisisArticles.find((item) => item.id === id)
  return article
    ? Response.json(article)
    : Response.json(
        { error: { code: "crisis_not_found", message: "Den informationen hittades inte." } },
        { status: 404 }
      )
}
