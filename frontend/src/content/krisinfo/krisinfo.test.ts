import { describe, expect, it } from "vitest"
import type { VerifiedContent } from "../../types/krisinfo"
import { computeSignalStrokes } from "../../utils/signalPattern"
import { krisinfoSections } from "./index"

// These tests pin facts (numbers, timings, links, sources and dates), not wording. The texts
// are written in own words, so rewording a text needs no test change; changing a fact does.

const KRISINFORMATION_PHONES_URL =
  "https://www.krisinformation.se/detta-gor-samhallet/viktiga-telefonnummer/"
const VARDGUIDEN_1177_URL = "https://www.1177.se/om-1177/nar-du-ringer-1177/nar-du-ringer-1177/"
const SOS_ALARM_112_URL =
  "https://www.sosalarm.se/om-oss/vanliga-fragor-och-svar/for-privatpersoner/112-bra-att-veta-innan-du-ringer/"
const BRIS_URL = "https://www.bris.se/for-barn-och-unga/prata-med-oss/"
const TELETAL_URL = "https://www.teletal.se/"
const MCF_OUTDOOR_WARNING_URL =
  "https://www.mcf.se/sv/rad-till-privatpersoner/skyddsrum-utrymning-och-varningssystem/viktigt-meddelande-till-allmanheten-vma-och-andra-varningar/utomhusvarning--hesa-fredrik/"
const KRISINFORMATION_VMA_URL =
  "https://www.krisinformation.se/varningssystem/vma-flyglarm-och-beredskapslarm/viktigt-meddelande-till-allmanheten-sa-funkar-det/"
const MCF_AUDIO_BASE = "https://www.mcf.se/contentassets/ffc078def2284745ae47c8282f83839f"

const sections = Object.entries(krisinfoSections)
const allPosts: [string, VerifiedContent][] = sections.flatMap(([key, section]) => {
  const items: readonly VerifiedContent[] = section.items
  return [
    [key, section],
    ...items.map((item, index): [string, VerifiedContent] => [`${key}[${index}]`, item]),
  ]
})
const phoneSection = krisinfoSections["phone-numbers"]
const signalSection = krisinfoSections["warning-signals"]
const phones = phoneSection.items
const signals = signalSection.items

function signal(id: string) {
  const found = signals.find((item) => item.id === id)
  if (!found) throw new Error(`Missing signal ${id}`)
  return found
}

describe("krisinfo content", () => {
  it("uses each section's key as its id", () => {
    for (const [key, section] of sections) expect(section.id).toBe(key)
  })

  it.each(allPosts)("gives %s a named https source", (_name, post) => {
    expect(post.source.name.trim()).not.toBe("")
    expect(new URL(post.source.url).protocol).toBe("https:")
  })

  it("bases each phone post on its own source and every signal post on MCF", () => {
    const krisinformation = { name: "Krisinformation.se", url: KRISINFORMATION_PHONES_URL }
    expect(phoneSection.source).toEqual(krisinformation)
    expect(Object.fromEntries(phones.map((item) => [item.number, item.source]))).toEqual({
      "112": { name: "SOS Alarm", url: SOS_ALARM_112_URL },
      "1177": { name: "1177.se", url: VARDGUIDEN_1177_URL },
      "113 13": krisinformation,
      "114 14": krisinformation,
      "116 111": { name: "Bris", url: BRIS_URL },
      "020-22 11 44": { name: "Teletal", url: TELETAL_URL },
    })
    for (const post of [signalSection, ...signals]) {
      expect(post.source).toEqual({
        name: "Myndigheten för civilt försvar (MCF)",
        url: MCF_OUTDOOR_WARNING_URL,
      })
    }
  })

  it.each(allPosts)("records %s as verified on 2026-11-02", (_name, post) => {
    expect(post.lastVerified).toBe("2026-11-02")
    const date = new Date(`${post.lastVerified}T00:00:00Z`)
    expect(date.toISOString().slice(0, 10)).toBe(post.lastVerified)
    expect(date.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it("contains plain text only, without markup", () => {
    expect(JSON.stringify(krisinfoSections)).not.toMatch(/[<>]/)
  })

  it("gives every section and post its texts", () => {
    for (const section of [phoneSection, signalSection]) {
      expect(section.title.trim()).not.toBe("")
      expect(section.summary.trim()).not.toBe("")
    }
    for (const item of phones) {
      expect(item.label.trim()).not.toBe("")
      expect(item.description.trim()).not.toBe("")
      expect(item.whenToUse.trim()).not.toBe("")
    }
    for (const item of signals) {
      expect(item.name.trim()).not.toBe("")
      expect(item.patternDescription.trim()).not.toBe("")
      for (const step of item.whatToDo) expect(step.text.trim()).not.toBe("")
    }
  })

  it("lists the six phone numbers in order with 112 as the only emergency number", () => {
    expect(phones.map((item) => item.number)).toEqual([
      "112",
      "1177",
      "113 13",
      "114 14",
      "116 111",
      "020-22 11 44",
    ])
    expect(phones.filter((item) => item.isEmergency).map((item) => item.number)).toEqual(["112"])
  })

  it("names each phone number in its whenToUse text", () => {
    for (const item of phones) expect(item.whenToUse).toContain(item.number)
  })

  it("gives the source's numbers for calls from abroad in their own field", () => {
    expect(Object.fromEntries(phones.map((item) => [item.number, item.abroadNumber]))).toEqual({
      "112": undefined,
      "1177": "+46 771-11 77 00",
      "113 13": "+46 77 33 113 13",
      "114 14": "+46 77 114 14 00",
      "116 111": undefined,
      "020-22 11 44": undefined,
    })
    for (const item of phones) expect(item.description).not.toMatch(/\+46/)
  })

  it("does not repeat whenToUse as a phone's description", () => {
    for (const item of phones) expect(item.description).not.toBe(item.whenToUse)
  })

  it("describes the four signals with unique ids and the source's timings", () => {
    expect(signals.map((item) => item.id)).toEqual([
      "important-message",
      "air-raid",
      "readiness-alert",
      "all-clear",
    ])
    expect(Object.fromEntries(signals.map((item) => [item.name, item.pattern]))).toEqual({
      "Viktigt meddelande": { toneSeconds: 7, pauseSeconds: 14, totalDurationSeconds: 120 },
      Flyglarm: { toneSeconds: 2, pauseSeconds: 2, totalDurationSeconds: 60 },
      Beredskapslarm: { toneSeconds: 30, pauseSeconds: 15, totalDurationSeconds: 300 },
      "Faran över": { toneSeconds: 30, pauseSeconds: 0, repeatCount: 1 },
    })
  })

  it("fits the source's 6 tones of Viktigt meddelande into its 2-minute duration", () => {
    expect(computeSignalStrokes(signal("important-message").pattern).strokes).toHaveLength(6)
  })

  it("gives every signal a usable pattern with exactly one end condition", () => {
    for (const { pattern } of signals) {
      expect(pattern.toneSeconds).toBeGreaterThan(0)
      expect(pattern.pauseSeconds).toBeGreaterThanOrEqual(0)
      const ends = [pattern.repeatCount, pattern.totalDurationSeconds].filter(
        (value) => value !== undefined
      )
      expect(ends).toHaveLength(1)
      expect(ends[0]).toBeGreaterThan(0)
    }
  })

  it("states the structured timings in each pattern description", () => {
    for (const { pattern, patternDescription } of signals) {
      expect(patternDescription).toContain(`${pattern.toneSeconds} sekunder`)
      if (pattern.pauseSeconds > 0) {
        expect(patternDescription).toContain(`${pattern.pauseSeconds} sekunders paus`)
      }
      if (pattern.repeatCount !== undefined && pattern.repeatCount > 1) {
        expect(patternDescription).toContain(`${pattern.repeatCount} gånger`)
      }
      if (pattern.totalDurationSeconds !== undefined) {
        expect(patternDescription).toContain(`${pattern.totalDurationSeconds / 60} minut`)
      }
    }
  })

  it("keeps the source's number of actions and its key terms", () => {
    expect(Object.fromEntries(signals.map((item) => [item.id, item.whatToDo.length]))).toEqual({
      "important-message": 5,
      "air-raid": 2,
      "readiness-alert": 4,
      "all-clear": 0,
    })
    expect(signal("important-message").whatToDo[4].text).toContain("113 13")
    expect(signal("readiness-alert").whatToDo[2].text).toContain("krigsplaceringsorder")
  })

  it("adds links only as complements to the P4 and Krisinformation.se steps", () => {
    const linked = signals.flatMap((item) =>
      item.whatToDo.flatMap((step, index) =>
        step.link ? [[item.id, index + 1, step.link.label, step.link.url]] : []
      )
    )
    expect(linked).toEqual([
      [
        "important-message",
        3,
        "Sveriges Radio – lokala P4-kanaler",
        "https://www.sverigesradio.se/kanaler",
      ],
      ["important-message", 4, "Krisinformation.se", "https://www.krisinformation.se/"],
      [
        "readiness-alert",
        2,
        "Sveriges Radio – lokala P4-kanaler",
        "https://www.sverigesradio.se/kanaler",
      ],
    ])
  })

  it("keeps every linked step readable without its link", () => {
    for (const item of signals) {
      for (const step of item.whatToDo) {
        if (!step.link) continue
        const target = step.link.url.includes("sverigesradio") ? "P4" : "Krisinformation.se"
        expect(step.text).toContain(target)
        expect(step.text).not.toContain(step.link.url)
        expect(step.link.label.trim()).not.toBe("")
        expect(new URL(step.link.url).protocol).toBe("https:")
      }
    }
  })

  it("gives meanings only where an official source states one", () => {
    const meanings = signals.map((item) => [
      item.id,
      item.meaning !== undefined,
      item.meaningSource?.url,
    ])
    expect(meanings).toEqual([
      ["important-message", true, KRISINFORMATION_VMA_URL],
      ["air-raid", false, undefined],
      ["readiness-alert", true, undefined],
      ["all-clear", false, undefined],
    ])
    for (const item of signals) {
      if (item.meaning !== undefined) expect(item.meaning.trim()).not.toBe("")
      if (item.meaningSource) {
        expect(item.meaning).toBeDefined()
        expect(item.meaningSource.name).toBe("Krisinformation.se")
      }
    }
  })

  it("links each signal to MCF's MP3 recording rather than a bundled file", () => {
    expect(Object.fromEntries(signals.map((item) => [item.id, item.audioLinkUrl]))).toEqual({
      "important-message": `${MCF_AUDIO_BASE}/01-viktigt-meddelande.mp3`,
      "air-raid": `${MCF_AUDIO_BASE}/03-flyglarm.mp3`,
      "readiness-alert": `${MCF_AUDIO_BASE}/04-beredskapslarm.mp3`,
      "all-clear": `${MCF_AUDIO_BASE}/02-faran-over-.mp3`,
    })
  })
})
