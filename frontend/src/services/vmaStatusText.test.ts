import { describe, expect, it } from "vitest"
import { formatVmaCheckTime, vmaStatusLines, type VmaStatus } from "./vmaStatusText"

const now = Date.parse("2026-10-13T10:00:00Z")
const fresh: VmaStatus = {
  loading: false,
  unavailable: false,
  stale: false,
  offline: false,
  uncertain: false,
  lastCheckedAt: "2026-10-13T08:05:00Z",
}

describe("formatVmaCheckTime", () => {
  it("shows only the Swedish local time for a check earlier today", () => {
    expect(formatVmaCheckTime("2026-10-13T08:05:00Z", now)).toBe("kl. 10:05")
  })

  it("decides today by Swedish local date, not UTC", () => {
    // 22:30 UTC on 12 October is 00:30 on 13 October in Sweden.
    expect(formatVmaCheckTime("2026-10-12T22:30:00Z", now)).toBe("kl. 00:30")
    expect(formatVmaCheckTime("2026-10-12T21:30:00Z", now)).toBe("den 12 oktober kl. 23:30")
  })

  it("adds the year for a check in another year", () => {
    expect(formatVmaCheckTime("2025-12-31T12:00:00Z", now)).toBe("den 31 december 2025 kl. 13:00")
  })
})

describe("vmaStatusLines", () => {
  it("reports nothing for fresh, complete information", () => {
    expect(vmaStatusLines(fresh, now)).toEqual([])
  })

  it("reports loading without implying that no VMA exists", () => {
    expect(vmaStatusLines({ ...fresh, loading: true, lastCheckedAt: null }, now)).toEqual([
      "Kontrollerar VMA…",
    ])
  })

  it("reports unavailable information, adding the connection state offline", () => {
    const unavailable = { ...fresh, unavailable: true, lastCheckedAt: null }
    expect(vmaStatusLines(unavailable, now)).toEqual(["VMA-information inte tillgänglig."])
    expect(vmaStatusLines({ ...unavailable, offline: true }, now)).toEqual([
      "VMA-information inte tillgänglig.",
      "Ingen internetanslutning.",
    ])
  })

  it("reports possibly outdated information with the last successful check", () => {
    expect(vmaStatusLines({ ...fresh, stale: true }, now)).toEqual([
      "VMA-informationen kan vara inaktuell. Senast kontrollerad kl. 10:05.",
    ])
    expect(
      vmaStatusLines(
        { ...fresh, stale: true, offline: true, lastCheckedAt: "2026-10-12T08:05:00Z" },
        now
      )
    ).toEqual([
      "VMA-informationen kan vara inaktuell. Senast kontrollerad den 12 oktober kl. 10:05.",
      "Ingen internetanslutning.",
    ])
  })

  it("combines outdated and incomplete information", () => {
    expect(vmaStatusLines({ ...fresh, stale: true, uncertain: true }, now)).toEqual([
      "VMA-informationen kan vara inaktuell. Senast kontrollerad kl. 10:05.",
      "VMA-informationen kan vara ofullständig.",
    ])
  })
})
