import { describe, expect, it, vi } from "vitest"
import { installPromptEvent as installEvent } from "./__fixtures__/installPrompt"
import { createInstallPromptService, type InstallPromptWindow } from "./installPromptService"

function fakeWindow(options: { standalone?: boolean; matchMedia?: boolean } = {}) {
  const media = Object.assign(new EventTarget(), { matches: options.standalone ?? false })
  const browserWindow = Object.assign(
    new EventTarget(),
    options.matchMedia === false ? {} : { matchMedia: vi.fn(() => media) }
  )
  return { browserWindow: browserWindow as unknown as InstallPromptWindow & EventTarget, media }
}

function startedService(options?: Parameters<typeof fakeWindow>[0]) {
  const fake = fakeWindow(options)
  const service = createInstallPromptService(fake.browserWindow)
  service.start()
  return { ...fake, service }
}

describe("installPromptService", () => {
  it("cannot install before the browser sends an install event", () => {
    const { service } = startedService()

    expect(service.getSnapshot()).toEqual({ canInstall: false })
  })

  it("retains the event, suppresses the browser's own prompt and notifies subscribers", () => {
    const { browserWindow, service } = startedService()
    const notify = vi.fn()
    service.subscribe(notify)
    const event = installEvent()

    browserWindow.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(service.getSnapshot()).toEqual({ canInstall: true })
    expect(notify).toHaveBeenCalledOnce()
  })

  it("prompts once with the retained event, returns the choice and clears the offer", async () => {
    const { browserWindow, service } = startedService()
    const event = installEvent()
    browserWindow.dispatchEvent(event)

    await expect(service.promptInstall()).resolves.toBe("accepted")

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(service.getSnapshot()).toEqual({ canInstall: false })
  })

  it("opens the prompt synchronously so the click's user activation still applies", () => {
    const { browserWindow, service } = startedService()
    const event = installEvent()
    browserWindow.dispatchEvent(event)

    void service.promptInstall()

    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it("ignores repeated activation while a prompt is open", async () => {
    const { browserWindow, service } = startedService()
    const event = installEvent()
    browserWindow.dispatchEvent(event)

    const first = service.promptInstall()
    const second = service.promptInstall()

    await expect(first).resolves.toBe("accepted")
    await expect(second).resolves.toBe("unavailable")
    expect(event.prompt).toHaveBeenCalledOnce()
  })

  it("hides the offer after a decline until the browser sends a new event", async () => {
    const { browserWindow, service } = startedService()
    browserWindow.dispatchEvent(installEvent("dismissed"))

    await expect(service.promptInstall()).resolves.toBe("dismissed")
    expect(service.getSnapshot()).toEqual({ canInstall: false })

    browserWindow.dispatchEvent(installEvent())
    expect(service.getSnapshot()).toEqual({ canInstall: true })
  })

  it("hides the offer when the app is installed", () => {
    const { browserWindow, service } = startedService()
    browserWindow.dispatchEvent(installEvent())

    browserWindow.dispatchEvent(new Event("appinstalled"))

    expect(service.getSnapshot()).toEqual({ canInstall: false })
  })

  it("never offers installation while running in standalone display mode", async () => {
    const { browserWindow, service } = startedService({ standalone: true })
    const event = installEvent()
    browserWindow.dispatchEvent(event)

    expect(service.getSnapshot()).toEqual({ canInstall: false })
    await expect(service.promptInstall()).resolves.toBe("unavailable")
    expect(event.prompt).not.toHaveBeenCalled()
  })

  it("follows changes to and from standalone display mode", () => {
    const { browserWindow, media, service } = startedService()
    browserWindow.dispatchEvent(installEvent())

    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }))
    expect(service.getSnapshot()).toEqual({ canInstall: false })

    media.dispatchEvent(Object.assign(new Event("change"), { matches: false }))
    expect(service.getSnapshot()).toEqual({ canInstall: true })
  })

  it("settles as unavailable when the browser rejects the prompt", async () => {
    const { browserWindow, service } = startedService()
    const event = installEvent()
    event.prompt.mockRejectedValue(new DOMException("Already shown.", "InvalidStateError"))
    browserWindow.dispatchEvent(event)

    await expect(service.promptInstall()).resolves.toBe("unavailable")
    expect(service.getSnapshot()).toEqual({ canInstall: false })
  })

  it("works without matchMedia", () => {
    const { browserWindow, service } = startedService({ matchMedia: false })

    browserWindow.dispatchEvent(installEvent())

    expect(service.getSnapshot()).toEqual({ canInstall: true })
  })

  it("does nothing outside the browser", async () => {
    const service = createInstallPromptService(null)

    expect(() => service.start()).not.toThrow()
    await expect(service.promptInstall()).resolves.toBe("unavailable")
  })

  it("stops listening and forgets the event when disposed", () => {
    const { browserWindow, service } = startedService()
    browserWindow.dispatchEvent(installEvent())

    service.dispose()
    expect(service.getSnapshot()).toEqual({ canInstall: false })

    const later = installEvent()
    browserWindow.dispatchEvent(later)
    expect(later.defaultPrevented).toBe(false)
    expect(service.getSnapshot()).toEqual({ canInstall: false })
  })
})
