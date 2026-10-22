// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installPromptEvent as installEvent } from "../services/__fixtures__/installPrompt"
import { installPromptService } from "../services/installPromptService"
import { useInstallPrompt } from "./useInstallPrompt"

let standalone = false
let displayModeListeners: Array<(event: { matches: boolean }) => void> = []

function dispatch(event: Event) {
  act(() => {
    window.dispatchEvent(event)
  })
}

beforeEach(() => {
  standalone = false
  displayModeListeners = []
  // jsdom has no matchMedia; the shared service reads it when started.
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return standalone
    },
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
      displayModeListeners.push(listener),
    removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      displayModeListeners = displayModeListeners.filter((item) => item !== listener)
    },
  }))
})

afterEach(() => {
  cleanup()
  installPromptService.dispose()
  vi.unstubAllGlobals()
})

describe("useInstallPrompt", () => {
  it("cannot install when no install event has been received", () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.canInstall).toBe(false)
  })

  it("can install once the browser sends an install event", () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())

    dispatch(installEvent())

    expect(result.current.canInstall).toBe(true)
  })

  it("keeps an event received before the first render", () => {
    installPromptService.start()
    window.dispatchEvent(installEvent())

    const { result } = renderHook(() => useInstallPrompt())

    expect(result.current.canInstall).toBe(true)
  })

  it("prompts with the retained event and then cannot install again", async () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())
    const event = installEvent()
    dispatch(event)

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.promptInstall()
    })

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(outcome).toBe("accepted")
    expect(result.current.canInstall).toBe(false)
  })

  it("cannot install after the app is installed", () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())
    dispatch(installEvent())

    dispatch(new Event("appinstalled"))

    expect(result.current.canInstall).toBe(false)
  })

  it("cannot install while running standalone", () => {
    standalone = true
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())

    dispatch(installEvent())

    expect(result.current.canInstall).toBe(false)
  })

  it("stops offering installation when the display mode becomes standalone", () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())
    dispatch(installEvent())

    act(() => {
      displayModeListeners.forEach((listener) => listener({ matches: true }))
    })

    expect(result.current.canInstall).toBe(false)
  })

  it("cannot install after a decline until the browser sends a new event", async () => {
    installPromptService.start()
    const { result } = renderHook(() => useInstallPrompt())
    dispatch(installEvent("dismissed"))

    await act(async () => {
      await result.current.promptInstall()
    })
    expect(result.current.canInstall).toBe(false)

    dispatch(installEvent())
    expect(result.current.canInstall).toBe(true)
  })
})
