// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { ModeProvider } from "../context/ModeProvider"
import {
  alert,
  cachedResponse,
  checkedAt,
  feed,
  feedData,
  info,
  now,
} from "../services/__fixtures__/vma"
import { useVmaBanner } from "./useVmaBanner"

let fetchMock = vi.fn<typeof fetch>()
/** The validator normalizes the backend check time to a full ISO 8601 UTC string. */
const lastCheckedAt = new Date(checkedAt).toISOString()

/** Mounts the hook inside the real ModeProvider, which supplies browser connectivity. */
function renderVmaHook({ strict = false } = {}) {
  return renderHook(() => useVmaBanner(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      strict ? (
        <StrictMode>
          <ModeProvider>{children}</ModeProvider>
        </StrictMode>
      ) : (
        <ModeProvider>{children}</ModeProvider>
      ),
  })
}

function setConnectivity(online: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online)
  window.dispatchEvent(new Event(online ? "online" : "offline"))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useVmaBanner", () => {
  it("loads through the actual validator/mapper and shares one request and timer in StrictMode", async () => {
    fetchMock.mockImplementation(async () => Response.json(feed()))
    const { result, rerender } = renderVmaHook({ strict: true })
    expect(result.current.loading).toBe(true)
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({
      message: { id: alert.identifier, title: info.event },
      messages: [{ id: alert.identifier, status: "active" }],
      loading: false,
      stale: false,
      unavailable: false,
      uncertain: false,
      lastCheckedAt,
    })
    rerender()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_999)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("reports the backend's check time from each poll, not the client's fetch time", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current.lastCheckedAt).toBe(lastCheckedAt)
    const nextCheck = "2026-10-05T12:00:55Z"
    fetchMock.mockResolvedValueOnce(
      Response.json(cachedResponse(feedData(), { checkedAt: nextCheck }))
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current.lastCheckedAt).toBe(new Date(nextCheck).toISOString())
  })

  it("removes a displayed warning when a later poll succeeds with no active VMA", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current.message?.id).toBe(alert.identifier)
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current).toMatchObject({
      message: null,
      activeMessages: [],
      stale: false,
      unavailable: false,
    })
  })

  it("keeps the warning and its last check time when a poll fails, then recovers on the next poll", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      stale: true,
      loading: false,
      lastCheckedAt,
    })
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current).toMatchObject({ message: null, stale: false, unavailable: false })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("marks a backend stale response as possibly outdated with its check time", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(cachedResponse(feedData(), { stale: true })))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      stale: true,
      unavailable: false,
      lastCheckedAt,
    })
  })

  it("marks retained data as outdated as soon as the device goes offline", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current.stale).toBe(false)
    act(() => setConnectivity(false))
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      stale: true,
      offline: true,
      lastCheckedAt,
    })
  })

  it("reports unavailable information after a failure until a background poll succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({ unavailable: true, loading: false })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    // A silent background poll must not replace the unavailable notice with loading.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current).toMatchObject({ unavailable: true, loading: false })
  })

  it("keeps an active warning visible and loading unset while a background poll is pending", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      loading: false,
      retrying: false,
    })
  })

  it("keeps an active warning visible during a manual retry", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    act(() => result.current.retry())
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      activeMessages: [{ id: alert.identifier }],
      retrying: true,
      lastCheckedAt,
    })
  })

  it("does not fetch on an offline start and fetches as soon as the connection returns", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    fetchMock.mockResolvedValue(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({
      message: null,
      loading: false,
      unavailable: true,
      offline: true,
    })

    act(() => setConnectivity(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(true)
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      stale: false,
      unavailable: false,
    })
  })

  it("pauses polling offline, keeps the warning and fetches immediately on reconnection", async () => {
    fetchMock.mockImplementation(async () => Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    act(() => setConnectivity(false))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.message?.id).toBe(alert.identifier)

    act(() => setConnectivity(true))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await act(async () => {})
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("pauses polling in a hidden tab and fetches when it becomes visible after the interval", async () => {
    fetchMock.mockImplementation(async () => Response.json(feed()))
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    renderVmaHook()
    await act(async () => {})
    visibility.mockReturnValue("hidden")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    visibility.mockReturnValue("visible")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("hides the warning on a successful empty response", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([])))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: null,
      stale: false,
      unavailable: false,
      loading: false,
      uncertain: false,
      messages: [],
    })
  })

  it.each([
    { name: "HTTP 502", response: () => new Response("Failure", { status: 502 }) },
    { name: "HTTP 504", response: () => new Response("Failure", { status: 504 }) },
    { name: "invalid JSON", response: () => new Response("{") },
    { name: "invalid envelope", response: () => Response.json({ alerts: [] }) },
    { name: "invalid records", response: () => Response.json(feed([null, {}])) },
  ])("keeps $name distinct from successful empty data", async ({ response }) => {
    fetchMock.mockResolvedValue(response())
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: null,
      unavailable: true,
      loading: false,
      lastCheckedAt: null,
    })
  })

  it("allows one retry after a network failure and handles a subsequent empty success", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current.unavailable).toBe(true)
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    act(() => {
      result.current.retry()
      result.current.retry()
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.retrying).toBe(true)
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: null,
      stale: false,
      unavailable: false,
      loading: false,
      retrying: false,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("surfaces the service deadline as an error", async () => {
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("", "AbortError"))
          )
        })
    )
    const { result } = renderVmaHook()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
    })
    expect(result.current).toMatchObject({ message: null, unavailable: true, loading: false })
  })

  it("keeps valid records when a peer is rejected and reports incomplete information", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([alert, null])))
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      uncertain: true,
      stale: false,
      unavailable: false,
    })
  })

  it("retains an active warning on failed retry, then expires it without another request", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        feed([{ ...alert, info: [{ ...info, expires: new Date(now + 1_000).toISOString() }] }])
      )
    )
    const { result } = renderVmaHook()
    await act(async () => {})
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    act(() => result.current.retry())
    expect(result.current.message?.id).toBe(alert.identifier)
    await act(async () => {})
    expect(result.current).toMatchObject({ message: { id: alert.identifier }, stale: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({
      message: null,
      stale: true,
      lastCheckedAt,
      messages: [{ id: alert.identifier, status: "inactive", inactiveReason: "expired" }],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("removes a previous warning after a successful empty retry", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderVmaHook()
    await act(async () => {})
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    await act(async () => result.current.retry())
    expect(result.current).toMatchObject({
      message: null,
      stale: false,
      unavailable: false,
      uncertain: false,
    })
  })

  it("applies a cancellation when its future sent time is reached", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        feed([
          alert,
          {
            ...alert,
            identifier: "cancel",
            msgType: "Cancel",
            sent: new Date(now + 1_000).toISOString(),
            references: `${alert.sender},${alert.identifier},${alert.sent}`,
            info: null,
          },
        ])
      )
    )
    const { result } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({ message: { id: alert.identifier }, uncertain: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({
      message: null,
      uncertain: false,
      stale: false,
      unavailable: false,
    })
    expect(
      result.current.messages.find((message) => message.id === alert.identifier)
    ).toMatchObject({
      status: "inactive",
      inactiveReason: "cancelled",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rechecks validity on return to a visible tab before the refresh it starts completes", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    const { result } = renderVmaHook()
    await act(async () => {})
    vi.setSystemTime(Date.parse(info.expires))
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(result.current.message).toBe(null)
    expect(result.current.lastCheckedAt).toBe(lastCheckedAt)
    // The interval elapsed while hidden, so becoming visible also starts one refresh.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("ignores an old mount's late response and cleans up local validity timers", async () => {
    let finishOldRequest: (response: Response) => void = () => {}
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldRequest = resolve
        })
    )
    const first = renderVmaHook()
    first.unmount()
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    const second = renderVmaHook()
    await act(async () => {})
    await act(async () => finishOldRequest(Response.json(feed())))
    expect(second.result.current).toMatchObject({ message: null, stale: false, unavailable: false })
    second.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("selects the next active message when the newest expires", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        feed([
          alert,
          {
            ...alert,
            identifier: "newest",
            sent: new Date(now).toISOString(),
            info: [{ ...info, expires: new Date(now + 1_000).toISOString() }],
          },
        ])
      )
    )
    const { result, unmount } = renderVmaHook()
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: { id: "newest" },
      activeMessages: [{ id: "newest" }, { id: alert.identifier }],
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      activeMessages: [{ id: alert.identifier }],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("updates the ordered active list as messages become active and expire", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        feed([
          alert,
          {
            ...alert,
            identifier: "expiring",
            info: [{ ...info, expires: new Date(now + 1_000).toISOString() }],
          },
          { ...alert, identifier: "future", sent: new Date(now + 2_000).toISOString() },
        ])
      )
    )
    const { result } = renderVmaHook()
    await act(async () => {})
    const ids = () => result.current.activeMessages.map((message) => message.id)
    expect(ids()).toEqual([alert.identifier, "expiring"])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(ids()).toEqual([alert.identifier])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(ids()).toEqual(["future", alert.identifier])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
