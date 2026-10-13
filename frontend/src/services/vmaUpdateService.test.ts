import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { VmaResult } from "../types/vma"
import { checkedAt, now, source } from "./__fixtures__/vma"
import { createVmaUpdateService } from "./vmaUpdateService"

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible"

  setVisibility(next: DocumentVisibilityState) {
    this.visibilityState = next
    this.dispatchEvent(new Event("visibilitychange"))
  }
}

function result(overrides: Partial<VmaResult> = {}): VmaResult {
  return {
    messages: [],
    source,
    feedUpdatedAt: new Date(now).toISOString(),
    checkedAt,
    stale: false,
    evaluatedAt: new Date(now).toISOString(),
    issues: [],
    rejectedCount: 0,
    excludedCount: 0,
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

let fakeDocument: FakeDocument
let fetchVmas = vi.fn<() => Promise<VmaResult>>()

function create(online = true) {
  return createVmaUpdateService({ fetchVmas, document: fakeDocument }, online)
}

/** Lets settled requests publish and schedule before advancing further. */
async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  fakeDocument = new FakeDocument()
  fetchVmas = vi.fn<() => Promise<VmaResult>>().mockImplementation(async () => result())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("createVmaUpdateService", () => {
  it("fetches once on start online and marks the first request as initial", async () => {
    const service = create()
    service.start()
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    expect(service.getSnapshot().checking).toBe("initial")
    await advance(0)
    expect(service.getSnapshot()).toEqual({ result: result(), failed: false, checking: "none" })
    service.stop()
  })

  it("does not fetch on an offline start and fetches immediately on reconnection", async () => {
    const service = create(false)
    service.start()
    await advance(60_000)
    expect(fetchVmas).not.toHaveBeenCalled()
    expect(service.getSnapshot()).toEqual({ result: null, failed: false, checking: "none" })

    service.setOnline(true)
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    expect(service.getSnapshot().checking).toBe("initial")
    service.stop()
  })

  it("polls every 30 seconds after the previous attempt completes", async () => {
    const service = create()
    service.start()
    await advance(0)
    await advance(29_999)
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(3)
    service.stop()
  })

  it("keeps background polls silent and replaces the result on each success", async () => {
    const service = create()
    const states: string[] = []
    service.subscribe(() => states.push(service.getSnapshot().checking))
    service.start()
    await advance(0)
    const later = result({ checkedAt: "2026-10-05T12:01:00Z", messages: [] })
    fetchVmas.mockResolvedValueOnce(later)
    await advance(30_000)
    expect(states).toEqual(["initial", "none", "none"])
    expect(service.getSnapshot().result).toBe(later)
    service.stop()
  })

  it("never overlaps a slow request or schedules a second timer while it is pending", async () => {
    const slow = deferred<VmaResult>()
    fetchVmas.mockReturnValueOnce(slow.promise)
    const service = create()
    service.start()
    await advance(90_000)
    void service.retry()
    service.setOnline(false)
    service.setOnline(true)
    fakeDocument.setVisibility("hidden")
    fakeDocument.setVisibility("visible")
    expect(fetchVmas).toHaveBeenCalledTimes(1)

    slow.resolve(result())
    await advance(0)
    expect(vi.getTimerCount()).toBe(1)
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(1)
    service.stop()
  })

  it("shares one request and one timer across a StrictMode-style start, stop and start", async () => {
    const service = create()
    service.start()
    service.stop()
    service.start()
    service.start()
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    await advance(0)
    expect(vi.getTimerCount()).toBe(1)
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    service.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("keeps a response that arrives after stop without scheduling another request", async () => {
    const slow = deferred<VmaResult>()
    fetchVmas.mockReturnValueOnce(slow.promise)
    const service = create()
    service.start()
    service.stop()
    slow.resolve(result())
    await advance(120_000)
    expect(service.getSnapshot().result).toEqual(result())
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("pauses offline and fetches immediately when the connection returns", async () => {
    const service = create()
    service.start()
    await advance(0)
    service.setOnline(false)
    await advance(120_000)
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)

    service.setOnline(true)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    await advance(0)
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(3)
    service.stop()
  })

  it("pauses while hidden and fetches on becoming visible once the interval has elapsed", async () => {
    const service = create()
    service.start()
    await advance(0)
    fakeDocument.setVisibility("hidden")
    await advance(45_000)
    expect(fetchVmas).toHaveBeenCalledTimes(1)

    fakeDocument.setVisibility("visible")
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    service.stop()
  })

  it("waits for the rest of the interval when the tab becomes visible early", async () => {
    const service = create()
    service.start()
    await advance(0)
    fakeDocument.setVisibility("hidden")
    await advance(10_000)
    fakeDocument.setVisibility("visible")
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    await advance(19_999)
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    service.stop()
  })

  it("fetches on start in a hidden tab but does not poll until it is visible", async () => {
    fakeDocument.visibilityState = "hidden"
    const service = create()
    service.start()
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    await advance(60_000)
    expect(fetchVmas).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    service.stop()
  })

  it("retains the last result after a failure and keeps polling until it recovers", async () => {
    const service = create()
    service.start()
    await advance(0)
    const retained = service.getSnapshot().result

    fetchVmas.mockRejectedValueOnce(new Error("Backend unavailable"))
    await advance(30_000)
    expect(service.getSnapshot()).toEqual({ result: retained, failed: true, checking: "none" })

    fetchVmas.mockRejectedValueOnce(new Error("Backend unavailable"))
    await advance(30_000)
    expect(service.getSnapshot().failed).toBe(true)

    const recovered = result({ checkedAt: "2026-10-05T12:01:30Z" })
    fetchVmas.mockResolvedValueOnce(recovered)
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(4)
    expect(service.getSnapshot()).toEqual({ result: recovered, failed: false, checking: "none" })
    service.stop()
  })

  it("keeps polling after a failure before any successful result", async () => {
    fetchVmas.mockRejectedValueOnce(new Error("Backend unavailable"))
    const service = create()
    service.start()
    await advance(0)
    expect(service.getSnapshot()).toEqual({ result: null, failed: true, checking: "none" })
    await advance(30_000)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot()).toEqual({ result: result(), failed: false, checking: "none" })
    service.stop()
  })

  it("marks a manual retry as user-visible, also when it joins a pending background poll", async () => {
    const service = create()
    service.start()
    await advance(0)
    const background = deferred<VmaResult>()
    fetchVmas.mockReturnValueOnce(background.promise)
    await advance(30_000)
    expect(service.getSnapshot().checking).toBe("none")

    const first = service.retry()
    const second = service.retry()
    expect(first).toBe(second)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot()).toMatchObject({ checking: "manual", result: result() })

    background.resolve(result())
    await advance(0)
    expect(service.getSnapshot().checking).toBe("none")
    service.stop()
  })

  it("restarts the interval after a manual retry", async () => {
    const service = create()
    service.start()
    await advance(20_000)
    await service.retry()
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    await advance(29_999)
    expect(fetchVmas).toHaveBeenCalledTimes(2)
    await advance(1)
    expect(fetchVmas).toHaveBeenCalledTimes(3)
    service.stop()
  })

  it("ignores retry while offline or before start", async () => {
    const service = create(false)
    await service.retry()
    service.start()
    await service.retry()
    expect(fetchVmas).not.toHaveBeenCalled()
    service.stop()
  })

  it("notifies subscribers only for changed state and stops after unsubscribing", async () => {
    const service = create()
    const notify = vi.fn()
    const unsubscribe = service.subscribe(notify)
    service.start()
    await advance(0)
    expect(notify).toHaveBeenCalledTimes(2)
    const snapshot = service.getSnapshot()

    fetchVmas.mockResolvedValueOnce(snapshot.result!)
    await advance(30_000)
    expect(notify).toHaveBeenCalledTimes(2)
    expect(service.getSnapshot()).toBe(snapshot)

    unsubscribe()
    fetchVmas.mockRejectedValueOnce(new Error("Backend unavailable"))
    await advance(30_000)
    expect(notify).toHaveBeenCalledTimes(2)
    service.stop()
  })
})
