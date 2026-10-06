// @vitest-environment jsdom
import { StrictMode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { alert, feed, info, now } from "../services/__fixtures__/vma"
import { useVmaBanner } from "./useVmaBanner"

let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
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
  it("loads through the actual validator/mapper and shares the request in StrictMode", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    const { result, rerender } = renderHook(() => useVmaBanner(), { wrapper: StrictMode })
    expect(result.current.loading).toBe(true)
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current).toMatchObject({
      message: { id: alert.identifier, title: info.event },
      loading: false,
      failed: false,
      uncertain: false,
      lastCheckedAt: new Date(now).toISOString(),
    })
    rerender()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("hides the warning on a successful empty response", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([])))
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: null,
      failed: false,
      loading: false,
      uncertain: false,
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
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: null,
      failed: true,
      loading: false,
      lastCheckedAt: null,
    })
  })

  it("allows one retry after a network failure and handles a subsequent empty success", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current.failed).toBe(true)
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
      failed: false,
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
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
    })
    expect(result.current).toMatchObject({ message: null, failed: true, loading: false })
  })

  it("keeps valid records when a peer is rejected and reports incomplete information", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([alert, null])))
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current).toMatchObject({
      message: { id: alert.identifier },
      uncertain: true,
      failed: false,
    })
  })

  it("retains an active warning on failed retry, then expires it without another request", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        feed([{ ...alert, info: [{ ...info, expires: new Date(now + 1_000).toISOString() }] }])
      )
    )
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    fetchMock.mockRejectedValueOnce(new TypeError("Offline"))
    act(() => result.current.retry())
    expect(result.current.message?.id).toBe(alert.identifier)
    await act(async () => {})
    expect(result.current).toMatchObject({ message: { id: alert.identifier }, failed: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({
      message: null,
      failed: true,
      lastCheckedAt: new Date(now).toISOString(),
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("removes a previous warning after a successful empty retry", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(feed()))
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    await act(async () => result.current.retry())
    expect(result.current).toMatchObject({ message: null, failed: false, uncertain: false })
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
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current).toMatchObject({ message: { id: alert.identifier }, uncertain: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({ message: null, uncertain: false, failed: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rechecks validity on return to a visible tab even when background timers have not fired", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))
    const { result } = renderHook(() => useVmaBanner())
    await act(async () => {})
    vi.setSystemTime(Date.parse(info.expires))
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(result.current.message).toBe(null)
    expect(result.current.lastCheckedAt).toBe(new Date(now).toISOString())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("ignores an old mount's late response and cleans up local validity timers", async () => {
    let finishOldRequest: (response: Response) => void = () => {}
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldRequest = resolve
        })
    )
    const first = renderHook(() => useVmaBanner())
    first.unmount()
    fetchMock.mockResolvedValueOnce(Response.json(feed([])))
    const second = renderHook(() => useVmaBanner())
    await act(async () => {})
    await act(async () => finishOldRequest(Response.json(feed())))
    expect(second.result.current).toMatchObject({ message: null, failed: false })
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
    const { result, unmount } = renderHook(() => useVmaBanner())
    await act(async () => {})
    expect(result.current).toMatchObject({ message: { id: "newest" }, hasMore: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    expect(result.current).toMatchObject({ message: { id: alert.identifier }, hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
