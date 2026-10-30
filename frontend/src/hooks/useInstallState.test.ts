// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installPromptEvent } from "../services/__fixtures__/installPrompt"
import { dismissInstallInstructions } from "../services/installInstructionsDismissal"
import { installPromptService } from "../services/installPromptService"
import type { InstallState } from "../types/pwa"
import { useInstallState } from "./useInstallState"

const iPhoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
const macSafari =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/18.5 Safari/605.1.15"
const windowsChrome =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"

function stubBrowser(userAgent: string, maxTouchPoints = 0, standalone = false) {
  vi.stubGlobal("navigator", { userAgent, maxTouchPoints, standalone })
}

function offerInstallPrompt() {
  act(() => {
    window.dispatchEvent(installPromptEvent())
  })
}

beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  // jsdom has no matchMedia; both the service and the platform detection read it.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  installPromptService.start()
})

afterEach(() => {
  cleanup()
  installPromptService.dispose()
  vi.unstubAllGlobals()
})

describe("useInstallState", () => {
  it.each<[string, string, number, InstallState]>([
    ["iPhone", iPhoneSafari, 5, "ios-instructions"],
    ["iPad reporting itself as a Mac", macSafari, 5, "ios-instructions"],
    ["Mac Safari", macSafari, 0, "macos-instructions"],
    ["Windows Chrome", windowsChrome, 0, "none"],
  ])("selects the state for %s without an install event", (_name, agent, touch, expected) => {
    stubBrowser(agent, touch)

    const { result } = renderHook(() => useInstallState())

    expect(result.current).toBe(expected)
  })

  it("selects none while running installed", () => {
    stubBrowser(iPhoneSafari, 5, true)

    const { result } = renderHook(() => useInstallState())

    expect(result.current).toBe("none")
  })

  it.each([
    ["Windows Chrome", windowsChrome, 0],
    ["iPhone", iPhoneSafari, 5],
    ["Mac Safari", macSafari, 0],
  ])("selects only the button when %s has an install event", (_name, agent, touch) => {
    stubBrowser(agent, touch)
    const { result } = renderHook(() => useInstallState())

    offerInstallPrompt()

    expect(result.current).toBe("button")
  })

  it("returns to the instructions when the install event is used up", async () => {
    stubBrowser(iPhoneSafari, 5)
    const { result } = renderHook(() => useInstallState())
    offerInstallPrompt()

    await act(async () => {
      await installPromptService.promptInstall()
    })

    expect(result.current).toBe("ios-instructions")
  })

  it("still selects the button after the instructions were dismissed", () => {
    stubBrowser(windowsChrome)
    dismissInstallInstructions()
    const { result } = renderHook(() => useInstallState())

    offerInstallPrompt()

    expect(result.current).toBe("button")
  })
})
