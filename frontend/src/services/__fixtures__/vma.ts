import type { VmaSource } from "../../types/vma"

/** Supplies synthetic fixtures matching SR's documented v3 examples, without live warnings. */
export const source: VmaSource = {
  name: "Sveriges Radio",
  url: "https://www.sverigesradio.se/",
  apiName: "Sveriges Radios VMA-API",
  apiVersion: "3",
  apiDocumentationUrl: "https://vmaapi.sr.se/index.html",
  apiUrl: "https://vmaapi.sr.se/api/v3/alerts",
}

export const now = Date.parse("2026-10-05T12:00:00Z")
export const info = {
  language: "sv-SE",
  category: ["Safety"],
  event: "Viktigt meddelande till allmänheten (VMA)",
  urgency: "Immediate",
  severity: "Severe",
  certainty: "Observed",
  expires: "2026-10-05T18:00:00+02:00",
  senderName: "Sveriges Radio",
  description: "Gå inomhus och stäng dörrar och fönster.\n\nLyssna på lokal P4.",
  area: [{ areaDesc: "Exempelkommunen", geocode: [{ valueName: "Kommun", value: "0180" }] }],
}
export const alert = {
  identifier: "SRCAP-example-1",
  incidents: "SRVMA-example-1",
  sender: "https://vmaapi.sr.se/api/v3",
  sent: "2026-10-05T13:00:00+02:00",
  status: "Actual",
  scope: "Public",
  msgType: "Alert",
  info: [info],
}

/**
 * Supplies simultaneous active warnings in deliberately unsorted feed order.
 *
 * Display order is the Update (newest sent), then alert and the second alert, whose equal sent
 * times are ordered by CAP ID. The last entry repeats alert unchanged to exercise deduplication.
 * The Update references a message absent from the feed, so nothing is superseded.
 */
export const multipleAlerts = [
  alert,
  {
    ...alert,
    identifier: "SRCAP-example-2",
    incidents: "SRVMA-example-2",
    info: [
      {
        ...info,
        event: "Gasläcka i Exempelstad",
        description: "Håll dig borta från hamnområdet.",
        area: [{ areaDesc: "Exempelstad", geocode: [{ valueName: "Kommun", value: "0181" }] }],
      },
    ],
  },
  {
    ...alert,
    identifier: "SRCAP-example-3",
    incidents: "SRVMA-example-3",
    sent: "2026-10-05T13:30:00+02:00",
    msgType: "Update",
    references: "https://vmaapi.sr.se/api/v3,SRCAP-example-0,2026-10-05T12:00:00+02:00",
    info: [
      {
        ...info,
        event: "Förorenat dricksvatten",
        description: "Koka vattnet innan du dricker det.",
        area: [{ areaDesc: "Exempellänet", geocode: [{ valueName: "Län", value: "01" }] }],
      },
    ],
  },
  { ...alert },
]

/** Wraps synthetic upstream entries in the source-attributed backend response. */
export function feed(alerts: unknown[] = [alert]) {
  return { source: { ...source }, timestamp: "2026-10-05T12:00:00Z", alerts }
}
