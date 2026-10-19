// @vitest-environment jsdom
import { StrictMode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useCrisisResource } from "./useCrisisResource"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

afterEach(cleanup)

describe("useCrisisResource", () => {
  it("loads afresh across source changes and ignores older resolutions", async () => {
    const online = deferred<string[]>()
    const offline = deferred<string[]>()
    const onlineLoader = vi.fn().mockReturnValueOnce(online.promise).mockResolvedValueOnce(["new"])
    const offlineLoader = vi.fn().mockReturnValue(offline.promise)
    const { result, rerender } = renderHook(
      ({ mode }) => useCrisisResource(mode, mode === "online" ? onlineLoader : offlineLoader),
      { initialProps: { mode: "online" } }
    )
    const firstSignal = onlineLoader.mock.calls[0][0] as AbortSignal
    rerender({ mode: "offline" })
    expect(firstSignal.aborted).toBe(true)
    await act(async () => offline.resolve(["saved"]))
    expect(result.current.state).toEqual({ status: "ready", data: ["saved"] })
    await act(async () => online.resolve(["old"]))
    expect(result.current.state).toEqual({ status: "ready", data: ["saved"] })
    rerender({ mode: "online" })
    expect(result.current.state.status).toBe("loading")
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", data: ["new"] }))
    expect(onlineLoader).toHaveBeenCalledTimes(2)
  })

  it("ignores a late failure after the selected article changes", async () => {
    const old = deferred<string>()
    const first = vi.fn().mockReturnValue(old.promise)
    const second = vi.fn().mockResolvedValue("second")
    const { result, rerender } = renderHook(
      ({ id }) => useCrisisResource(id, id === "first" ? first : second),
      { initialProps: { id: "first" } }
    )
    rerender({ id: "second" })
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", data: "second" }))
    await act(async () => old.reject(new Error("Late failure")))
    expect(result.current.state).toEqual({ status: "ready", data: "second" })
  })

  it("discards a previous online success on re-entry even when the new request fails", async () => {
    const next = deferred<string>()
    const online = vi.fn().mockResolvedValueOnce("previous").mockReturnValueOnce(next.promise)
    const offline = vi.fn().mockResolvedValue("saved")
    const { result, rerender } = renderHook(
      ({ mode }) => useCrisisResource(mode, mode === "online" ? online : offline),
      { initialProps: { mode: "online" } }
    )
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", data: "previous" }))
    rerender({ mode: "offline" })
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", data: "saved" }))
    rerender({ mode: "online" })
    expect(result.current.state).toEqual({ status: "loading" })
    await act(async () => next.reject(new Error("New request failed")))
    expect(result.current.state.status).toBe("error")
    expect(result.current.state).not.toHaveProperty("data")
  })

  it("retries an error once and exposes loading until the new result arrives", async () => {
    const next = deferred<string>()
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockReturnValueOnce(next.promise)
    const { result } = renderHook(() => useCrisisResource("online", loader))
    await waitFor(() => expect(result.current.state.status).toBe("error"))
    act(() => result.current.retry())
    expect(result.current.state).toEqual({ status: "loading", retrying: true })
    act(() => result.current.retry())
    expect(loader).toHaveBeenCalledTimes(2)
    await act(async () => next.resolve("recovered"))
    expect(result.current.state).toEqual({ status: "ready", data: "recovered" })
  })

  it("cancels StrictMode's first attempt and keeps the replay's result", async () => {
    const first = deferred<string>()
    const loader = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce("current")
    const { result, unmount } = renderHook(() => useCrisisResource("online", loader), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", data: "current" }))
    expect(loader.mock.calls[0][0].aborted).toBe(true)
    await act(async () => first.resolve("obsolete"))
    expect(result.current.state).toEqual({ status: "ready", data: "current" })
    unmount()
    expect(loader.mock.calls[1][0].aborted).toBe(true)
  })

  it("does not apply an old local update to a new attempt", async () => {
    const online = vi.fn().mockResolvedValue(["online"])
    const offline = vi.fn().mockResolvedValue(["saved"])
    const { result, rerender } = renderHook(
      ({ mode }) => useCrisisResource(mode, mode === "offline" ? offline : online),
      { initialProps: { mode: "offline" } }
    )
    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    const obsoleteUpdate = result.current.updateData
    rerender({ mode: "online" })
    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    act(() => obsoleteUpdate(() => []))
    expect(result.current.state).toEqual({ status: "ready", data: ["online"] })
  })
})
