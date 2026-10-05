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

/** Wraps synthetic upstream entries in the source-attributed backend response. */
export function feed(alerts: unknown[] = [alert]) {
  return { source: { ...source }, timestamp: "2026-10-05T12:00:00Z", alerts }
}
