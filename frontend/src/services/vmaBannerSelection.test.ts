import { describe, expect, it } from "vitest"
import type { VmaResult } from "../types/vma"
import { alert, feed, info, now } from "./__fixtures__/vma"
import { selectVmaBanner } from "./vmaBannerSelection"
import { mapVmaMessages } from "./vmaMapper"
import { validateVmaResponse } from "./vmaResponseValidator"

function result(alerts: unknown[] = [alert]): VmaResult {
  const { records, ...diagnostics } = validateVmaResponse(feed(alerts))
  return {
    ...diagnostics,
    messages: mapVmaMessages(records, diagnostics.source, now),
    evaluatedAt: new Date(now).toISOString(),
  }
}

describe("selectVmaBanner", () => {
  it("selects the newest active message independently of response order without mutating it", () => {
    const latest = { ...alert, identifier: "latest", sent: new Date(now).toISOString() }
    for (const records of [
      [alert, latest],
      [latest, alert],
    ]) {
      const input = result(records)
      const before = structuredClone(input)
      expect(selectVmaBanner(input)).toMatchObject({
        message: { id: "latest" },
        hasMore: true,
        uncertain: false,
      })
      expect(input).toEqual(before)
    }
  })

  it("uses ascending CAP IDs to break equal sent times", () => {
    const input = result([
      { ...alert, identifier: "b" },
      { ...alert, identifier: "a" },
    ])
    expect(selectVmaBanner(input).message?.id).toBe("a")
  })

  it("distinguishes an empty feed from incomplete data", () => {
    expect(selectVmaBanner(result([]))).toEqual({ message: null, hasMore: false, uncertain: false })
    const partial = result([alert, null])
    expect(selectVmaBanner(partial)).toMatchObject({
      message: { id: alert.identifier },
      uncertain: true,
    })
  })

  it.each([
    {
      name: "expired",
      record: { ...alert, info: [{ ...info, expires: new Date(now).toISOString() }] },
      uncertain: false,
    },
    { name: "cancelled", record: { ...alert, msgType: "Cancel", info: null }, uncertain: false },
    {
      name: "future",
      record: { ...alert, sent: new Date(now + 1_000).toISOString() },
      uncertain: true,
    },
    { name: "excluded", record: { ...alert, status: "Test" }, uncertain: true },
  ])("does not display a $name record as an active warning", ({ record, uncertain }) => {
    expect(selectVmaBanner(result([record]))).toEqual({ message: null, hasMore: false, uncertain })
  })

  it("retains active warnings with malformed optional fields and reports uncertainty", () => {
    const input = result([{ ...alert, references: "broken" }])
    expect(selectVmaBanner(input)).toMatchObject({
      message: { id: alert.identifier },
      uncertain: true,
    })
  })

  it("never presents a model without a usable title as a complete warning", () => {
    const input = result()
    input.messages[0].title = undefined
    expect(selectVmaBanner(input)).toEqual({ message: null, hasMore: false, uncertain: true })
    expect(selectVmaBanner(null)).toEqual({ message: null, hasMore: false, uncertain: false })
  })
})
