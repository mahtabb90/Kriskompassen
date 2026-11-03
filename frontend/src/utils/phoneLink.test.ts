import { describe, expect, it } from "vitest"
import { krisinfoSections } from "../content/krisinfo/index"
import { toTelHref } from "./phoneLink"

const phones = krisinfoSections["phone-numbers"].items

describe("toTelHref", () => {
  it("keeps only the digits of a domestic number", () => {
    expect(toTelHref("112")).toBe("tel:112")
    expect(toTelHref("113 13")).toBe("tel:11313")
  })

  it("drops hyphens and never adds a country code to a domestic number", () => {
    expect(toTelHref("020-22 11 44")).toBe("tel:020221144")
  })

  it("keeps the leading plus of an international number", () => {
    expect(toTelHref("+46 771-11 77 00")).toBe("tel:+46771117700")
  })

  it("ignores surrounding whitespace", () => {
    expect(toTelHref("  114 14 ")).toBe("tel:11414")
  })

  it.each([
    ["an empty string", ""],
    ["only whitespace", "   "],
    ["a plus inside the number", "112+3"],
    ["a plus without digits", "+"],
    ["letters", "112a"],
    ["parentheses", "(08) 123 45"],
    ["a doubled separator", "113  13"],
    ["a trailing separator", "113 13-"],
  ])("rejects %s instead of building a broken link", (_case, input) => {
    expect(() => toTelHref(input)).toThrow(RangeError)
  })

  it("builds the links for every phone number in the content", () => {
    expect(phones.map((phone) => toTelHref(phone.number))).toEqual([
      "tel:112",
      "tel:1177",
      "tel:11313",
      "tel:11414",
      "tel:116111",
      "tel:020221144",
    ])
  })

  it("builds the links for every number for calls from abroad in the content", () => {
    const abroad = phones.flatMap((phone) =>
      phone.abroadNumber ? [[phone.number, toTelHref(phone.abroadNumber)]] : []
    )
    expect(abroad).toEqual([
      ["1177", "tel:+46771117700"],
      ["113 13", "tel:+46773311313"],
      ["114 14", "tel:+46771141400"],
    ])
  })
})
