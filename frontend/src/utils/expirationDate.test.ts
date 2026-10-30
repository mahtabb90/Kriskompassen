import { describe, expect, it } from "vitest"
import { formatExpirationDate, getExpirationStatus } from "./expirationDate"

describe("getExpirationStatus", () => {
  const today = "2026-10-30"

  it("returns null when there is no expiration date", () => {
    expect(getExpirationStatus(undefined, today)).toBeNull()
  })

  it("returns expired when the date has passed", () => {
    expect(getExpirationStatus("2026-10-29", today)).toBe("expired")
  })

  it("returns soon when the expiration date is today", () => {
    expect(getExpirationStatus(today, today)).toBe("soon")
  })

  it("returns soon when the expiration date is within 30 days", () => {
    expect(getExpirationStatus("2026-11-29", today)).toBe("soon")
  })

  it("returns ok when the expiration date is more than 30 days away", () => {
    expect(getExpirationStatus("2026-11-30", today)).toBe("ok")
  })

  it("supports a custom warning threshold", () => {
    expect(getExpirationStatus("2026-11-04", today, 5)).toBe("soon")
    expect(getExpirationStatus("2026-11-05", today, 5)).toBe("ok")
    expect(getExpirationStatus("2026-11-06", today, 5)).toBe("ok")
  })

  it("returns null for invalid dates", () => {
    expect(getExpirationStatus("2026-02-30", today)).toBeNull()
  })
})

describe("formatExpirationDate", () => {
  it("formats dates using Swedish month names", () => {
    expect(formatExpirationDate("2026-10-30")).toBe("30 oktober 2026")
  })

  it("returns the original value for an invalid date", () => {
    expect(formatExpirationDate("invalid")).toBe("invalid")
  })
})
