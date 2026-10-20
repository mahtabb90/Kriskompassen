import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createPwaUpdateService,
  getServiceWorkerContainer,
  type PwaUpdateEnvironment,
} from "./pwaUpdateService"

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible"
}

function fakeContainer(overrides: Partial<ServiceWorkerContainer> = {}) {
  const container = Object.assign(new EventTarget(), {
    controller: null,
    getRegistration: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockRejectedValue(new Error("Registration should not be reached.")),
    ...overrides,
  })
  return container as unknown as ServiceWorkerContainer & {
    getRegistration: ReturnType<typeof vi.fn>
    register: ReturnType<typeof vi.fn>
  }
}

function environment(serviceWorker: ServiceWorkerContainer | undefined): PwaUpdateEnvironment {
  return {
    enabled: true,
    serviceWorker,
    document: new FakeDocument() as unknown as Document,
    window: Object.assign(new EventTarget(), {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    }) as unknown as Window,
    isOnline: () => true,
    reload: vi.fn(),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("getServiceWorkerContainer", () => {
  it("returns undefined when privacy settings make the getter throw", () => {
    const blocked = {
      get serviceWorker(): ServiceWorkerContainer {
        throw new DOMException("The operation is insecure.", "SecurityError")
      },
    } as unknown as Navigator

    expect(getServiceWorkerContainer(blocked)).toBeUndefined()
  })

  it("returns undefined when service workers are unsupported", () => {
    expect(getServiceWorkerContainer({} as Navigator)).toBeUndefined()
  })

  it("returns the container when it is available", () => {
    const container = fakeContainer()

    const browserNavigator = { serviceWorker: container } as unknown as Navigator

    expect(getServiceWorkerContainer(browserNavigator)).toBe(container)
  })
})

describe("registration failures", () => {
  it("settles silently and stays idle when register rejects", async () => {
    const container = fakeContainer({
      register: vi.fn().mockRejectedValue(new DOMException("Blocked.", "SecurityError")),
    })
    const service = createPwaUpdateService(environment(container))

    service.start()
    await expect(service.checkForUpdate()).resolves.toBeUndefined()

    expect(container.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    })
    expect(service.getSnapshot()).toEqual({ status: "idle" })
    service.dispose()
  })

  it("settles silently without registering when getRegistration rejects", async () => {
    const container = fakeContainer({
      getRegistration: vi.fn().mockRejectedValue(new DOMException("Blocked.", "SecurityError")),
    })
    const service = createPwaUpdateService(environment(container))

    service.start()
    await expect(service.checkForUpdate()).resolves.toBeUndefined()

    expect(container.register).not.toHaveBeenCalled()
    expect(service.getSnapshot()).toEqual({ status: "idle" })
    service.dispose()
  })

  it("does nothing when no container is available", async () => {
    const service = createPwaUpdateService(environment(undefined))

    expect(() => service.start()).not.toThrow()
    await expect(service.checkForUpdate()).resolves.toBeUndefined()
    expect(service.getSnapshot()).toEqual({ status: "idle" })
  })
})

describe("shared service bootstrap", () => {
  // The static import above already evaluated the module with Node's globals.
  beforeEach(() => {
    vi.resetModules()
  })

  function stubBrowser(browserNavigator: object, secure: boolean) {
    vi.stubGlobal("navigator", browserNavigator)
    vi.stubGlobal("document", new FakeDocument())
    vi.stubGlobal(
      "window",
      Object.assign(new EventTarget(), {
        isSecureContext: secure,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        location: { reload: vi.fn() },
      })
    )
  }

  async function startSharedService(options: { production: boolean; secure: boolean }) {
    const container = fakeContainer()
    vi.stubEnv("PROD", options.production)
    stubBrowser({ serviceWorker: container, onLine: true }, options.secure)
    const { pwaUpdateService } = await import("./pwaUpdateService")

    pwaUpdateService.start()
    await pwaUpdateService.checkForUpdate()
    pwaUpdateService.dispose()
    return container
  }

  it("is disabled outside production builds", async () => {
    const container = await startSharedService({ production: false, secure: true })

    expect(container.getRegistration).not.toHaveBeenCalled()
    expect(container.register).not.toHaveBeenCalled()
  })

  it("is disabled outside secure contexts", async () => {
    const container = await startSharedService({ production: true, secure: false })

    expect(container.getRegistration).not.toHaveBeenCalled()
    expect(container.register).not.toHaveBeenCalled()
  })

  it("registers in secure production builds", async () => {
    const container = await startSharedService({ production: true, secure: true })

    expect(container.register).toHaveBeenCalledOnce()
  })

  it("loads and starts without throwing when the service worker getter throws", async () => {
    vi.stubEnv("PROD", true)
    stubBrowser(
      {
        onLine: true,
        get serviceWorker(): ServiceWorkerContainer {
          throw new DOMException("The operation is insecure.", "SecurityError")
        },
      },
      true
    )

    const { pwaUpdateService } = await import("./pwaUpdateService")

    expect(() => pwaUpdateService.start()).not.toThrow()
    expect(pwaUpdateService.getSnapshot()).toEqual({ status: "idle" })
  })
})
