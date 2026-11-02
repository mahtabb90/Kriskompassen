import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissInstallInstructions,
  INSTALL_INSTRUCTIONS_HIDDEN_DAYS,
  isInstallInstructionsDismissed,
} from "./installInstructionsDismissal"

const dismissedAt = Date.UTC(2026, 0, 1)
const day = 24 * 60 * 60 * 1000
const hiddenPeriod = INSTALL_INSTRUCTIONS_HIDDEN_DAYS * day

function stubStorage() {
  const values = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  return values
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("installInstructionsDismissal", () => {
  it("hides the instructions for 30 days", () => {
    expect(INSTALL_INSTRUCTIONS_HIDDEN_DAYS).toBe(30)
  })

  describe("with working storage", () => {
    let values: Map<string, string>

    beforeEach(() => {
      values = stubStorage()
    })

    it("is not dismissed when nothing is stored", () => {
      expect(isInstallInstructionsDismissed(dismissedAt)).toBe(false)
    })

    it("is dismissed directly after closing", () => {
      dismissInstallInstructions(dismissedAt)

      expect(isInstallInstructionsDismissed(dismissedAt)).toBe(true)
    })

    it("stays dismissed until just before the hidden period ends", () => {
      dismissInstallInstructions(dismissedAt)

      expect(isInstallInstructionsDismissed(dismissedAt + hiddenPeriod - 1)).toBe(true)
    })

    it("expires exactly when the hidden period ends", () => {
      dismissInstallInstructions(dismissedAt)

      expect(isInstallInstructionsDismissed(dismissedAt + hiddenPeriod)).toBe(false)
    })

    it("is not dismissed when the stored time is in the future", () => {
      dismissInstallInstructions(dismissedAt + day)

      expect(isInstallInstructionsDismissed(dismissedAt)).toBe(false)
    })

    it.each(["not-a-number", "", "Infinity"])(
      "is not dismissed for the stored value %j",
      (value) => {
        dismissInstallInstructions(dismissedAt)
        const [key] = values.keys()
        values.set(key, value)

        expect(isInstallInstructionsDismissed(dismissedAt)).toBe(false)
      }
    )
  })

  describe("with unavailable storage", () => {
    function throwSecurityError(): never {
      throw new DOMException("Storage is blocked", "SecurityError")
    }

    it("is not dismissed when getItem throws", () => {
      vi.stubGlobal("localStorage", { getItem: throwSecurityError })

      expect(isInstallInstructionsDismissed(dismissedAt)).toBe(false)
    })

    it("does not throw when setItem throws", () => {
      vi.stubGlobal("localStorage", { setItem: throwSecurityError })

      expect(() => dismissInstallInstructions(dismissedAt)).not.toThrow()
    })

    it("does not throw when reading the localStorage property itself throws", () => {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get: throwSecurityError,
      })

      try {
        expect(isInstallInstructionsDismissed(dismissedAt)).toBe(false)
        expect(() => dismissInstallInstructions(dismissedAt)).not.toThrow()
      } finally {
        Reflect.deleteProperty(globalThis, "localStorage")
      }
    })
  })
})
