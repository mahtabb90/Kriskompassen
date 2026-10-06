import { describe, expect, it } from "vitest"
import type { ValidatedVmaRecord } from "../types/vma"
import { alert, feed, info, now, source } from "./__fixtures__/vma"
import { mapVmaMessage, mapVmaMessages } from "./vmaMapper"
import { validateVmaResponse } from "./vmaResponseValidator"

function record(overrides: Partial<ValidatedVmaRecord> = {}): ValidatedVmaRecord {
  return { ...validateVmaResponse(feed()).records[0], ...overrides }
}

function referenceTo(original: ValidatedVmaRecord) {
  return { sender: original.sender, identifier: original.identifier, sent: original.sent }
}

describe("mapVmaMessage", () => {
  it("preserves complete descriptions, instructions and all Swedish info blocks as text", () => {
    const first = {
      ...record().info[0],
      description: "  Första stycket.\n\nAndra stycket.  ",
      instruction: "<b>Stanna inne.</b>",
    }
    const second = { ...first, description: "Ytterligare text.", instruction: undefined }
    const message = mapVmaMessage(record({ info: [first, second] }), source, now)
    expect(message.title).toBe(info.event)
    expect(message.content).toBe(
      `${first.description}\n\n${first.instruction}\n\n${second.description}`
    )
    expect(message.details).toHaveLength(2)
    expect(mapVmaMessage(record(), source, now).content).toBe(info.description)
  })

  it("keeps the CAP ID stable and distinguishes a revision's ID from its incident ID", () => {
    const original = mapVmaMessage(record(), source, now)
    const repeated = mapVmaMessage(record(), source, now)
    const updated = mapVmaMessage(
      record({ identifier: "update-id", msgType: "Update" }),
      source,
      now
    )
    expect(original.id).toBe(alert.identifier)
    expect(repeated.id).toBe(original.id)
    expect(updated.id).not.toBe(original.id)
    expect(updated.incidentIds).toEqual(original.incidentIds)
  })

  it("retains provider and API details for future attribution", () => {
    const message = mapVmaMessage(record(), source, now)
    expect(message.source).toEqual(source)
    expect(message.source).not.toBe(source)
    expect(message.details[0].senderName).toBe("Sveriges Radio")
    const testSource = { ...source, apiUrl: "https://vmaapi.sr.se/testapi/v3/examples/data" }
    expect(mapVmaMessage(record(), testSource, now).source.apiUrl).toBe(testSource.apiUrl)
  })

  it("maps available times without fabricating a publication or update time", () => {
    expect(mapVmaMessage(record(), source, now)).toMatchObject({
      sentAt: "2026-10-05T11:00:00.000Z",
      details: [{ expires: "2026-10-05T16:00:00.000Z", language: "sv-SE" }],
    })
    expect(mapVmaMessage(record(), source, now)).not.toHaveProperty("publishedAt")
    expect(mapVmaMessage(record(), source, now)).not.toHaveProperty("updatedAt")
  })

  it("does not share mutable areas, codes, links, references or metadata with its inputs", () => {
    const original = record()
    const input = record({
      references: [referenceTo(original)],
      info: [{ ...original.info[0], web: source.url }],
    })
    const before = structuredClone(input)
    const message = mapVmaMessage(input, source, now)
    expect(input).toEqual(before)
    expect(message.links).toEqual([
      { label: "Mer information hos Sveriges Radio", url: source.url },
    ])
    message.areas[0].geocodes[0].value = "9999"
    message.details[0].area[0].name = "Ändrat"
    message.links[0].url = "https://example.org/"
    message.references[0].identifier = "changed"
    message.source.name = "Changed"
    message.incidentIds.push("changed")
    expect(input).toEqual(before)
    expect(source.name).toBe("Sveriges Radio")
    expect(message.details[0].area[0].geocodes[0].value).toBe("0180")
  })

  it.each(["Alert", "Update"] as const)("marks a current Actual/Public %s active", (msgType) => {
    expect(mapVmaMessage(record({ msgType }), source, now).status).toBe("active")
  })

  it("keeps a cancellation inactive without inventing its original text or area", () => {
    const message = mapVmaMessage(record({ msgType: "Cancel", info: [] }), source, now)
    expect(message).toMatchObject({
      status: "inactive",
      inactiveReason: "cancelled",
      title: undefined,
      content: undefined,
      areas: [],
      links: [],
      details: [],
    })
    expect(message.source).toEqual(source)
  })

  it("marks expired messages inactive at the exact expiry boundary", () => {
    const input = record()
    const expiry = Date.parse(input.info[0].expires)
    expect(mapVmaMessage(input, source, expiry - 1).status).toBe("active")
    expect(mapVmaMessage(input, source, expiry)).toMatchObject({
      status: "inactive",
      inactiveReason: "expired",
    })
  })

  it("does not label a future message or mixed-validity blocks active", () => {
    expect(mapVmaMessage(record({ sent: "2026-10-06T12:00:00Z" }), source, now).status).toBe(
      "unknown"
    )
    const input = record()
    expect(
      mapVmaMessage(
        record({ info: [input.info[0], { ...input.info[0], expires: "2026-10-04T12:00:00Z" }] }),
        source,
        now
      ).status
    ).toBe("unknown")
  })
})

describe("mapVmaMessages", () => {
  it.each(["Update", "Cancel"] as const)(
    "applies %s references regardless of feed order",
    (msgType) => {
      const original = record()
      const next = record({
        identifier: "next",
        msgType,
        sent: "2026-10-05T11:30:00.000Z",
        references: [referenceTo(original)],
        info: msgType === "Cancel" ? [] : original.info,
      })
      for (const records of [
        [original, next],
        [next, original],
      ]) {
        const messages = mapVmaMessages(records, source, now)
        expect(messages.find((message) => message.id === original.identifier)).toMatchObject({
          status: "inactive",
          inactiveReason: msgType === "Cancel" ? "cancelled" : "superseded",
        })
        expect(messages.find((message) => message.id === "next")?.status).toBe(
          msgType === "Cancel" ? "inactive" : "active"
        )
      }
    }
  )

  it("requires a matching sender and sent time, not just an identifier or shared incident", () => {
    const original = record()
    for (const references of [
      [],
      [{ ...referenceTo(original), sender: "different" }],
      [{ ...referenceTo(original), sent: "2026-10-05T10:00:00.000Z" }],
    ]) {
      const cancel = record({ identifier: "cancel", msgType: "Cancel", references, info: [] })
      expect(mapVmaMessages([original, cancel], source, now)[0].status).toBe("active")
    }
  })

  it("does not let a future or earlier cancellation supersede a current warning", () => {
    const original = record()
    for (const sent of ["2026-10-06T12:00:00Z", "2026-10-05T10:00:00Z"]) {
      const cancel = record({
        identifier: "cancel",
        msgType: "Cancel",
        sent,
        references: [referenceTo(original)],
        info: [],
      })
      expect(mapVmaMessages([original, cancel], source, now)[0].status).toBe("active")
    }
  })

  it("keeps standalone cancellations and their references for future consumers", () => {
    const original = record()
    const cancel = record({
      identifier: "cancel",
      msgType: "Cancel",
      references: [referenceTo(original)],
      info: [],
    })
    expect(mapVmaMessages([cancel], source, now)).toMatchObject([
      { id: "cancel", references: [referenceTo(original)], status: "inactive" },
    ])
  })
})
