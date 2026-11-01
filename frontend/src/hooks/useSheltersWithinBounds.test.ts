// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchSheltersWithinBounds, type ShelterBounds } from "../services/shelterService"
import { cacheShelters } from "../services/shelterStorageService"
import type { Shelter } from "../types/shelter"
import { useSheltersWithinBounds } from "./useSheltersWithinBounds"

vi.mock("../services/shelterService", () => ({ fetchSheltersWithinBounds: vi.fn() }))
vi.mock("../services/shelterStorageService", () => ({ cacheShelters: vi.fn() }))

const bounds: ShelterBounds = { north: 60, south: 58, east: 19, west: 17 }
const otherBounds: ShelterBounds = { north: 61, south: 59, east: 20, west: 18 }
const shelter: Shelter = {
  id: "1",
  number: "100001-1",
  address: "A-vägen 1",
  lat: 59.0,
  lon: 18.0,
  capacity: 10,
  type: "Skyddsrum",
}

function response(shelters: Shelter[]) {
  return {
    shelters,
    source: {
      name: "MCF",
      url: "https://example.com",
      apiName: "WFS",
      apiUrl: "https://example.com/wfs",
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe("useSheltersWithinBounds", () => {
  it("does not fetch before the debounce window elapses", () => {
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    act(() => vi.advanceTimersByTime(399))

    expect(fetchSheltersWithinBounds).not.toHaveBeenCalled()
  })

  it("fetches once the debounce window elapses", async () => {
    vi.mocked(fetchSheltersWithinBounds).mockResolvedValue(response([shelter]))
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(fetchSheltersWithinBounds).toHaveBeenCalledExactlyOnceWith(bounds, expect.anything())
    expect(result.current.state).toEqual({ status: "ready", shelters: [shelter] })
    expect(cacheShelters).toHaveBeenCalledExactlyOnceWith([shelter])
  })

  it("writes a response through to the shelter cache even when superseded before it resolved", async () => {
    let resolveFirst: (value: ReturnType<typeof response>) => void = () => {}
    vi.mocked(fetchSheltersWithinBounds).mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve))
    )
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    vi.mocked(fetchSheltersWithinBounds).mockResolvedValue(response([{ ...shelter, id: "2" }]))
    act(() => result.current.requestBounds(otherBounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    resolveFirst(response([shelter]))
    await Promise.resolve()

    // Both responses are cached, even though only the second one is reflected in state - the
    // shelter detail page's cache lookup shouldn't miss a shelter just because a later pan
    // superseded the request that found it.
    expect(cacheShelters).toHaveBeenCalledWith([shelter])
    expect(cacheShelters).toHaveBeenCalledWith([{ ...shelter, id: "2" }])
    expect(result.current.state).toEqual({ status: "ready", shelters: [{ ...shelter, id: "2" }] })
  })

  it("collapses rapid repeated calls into a single fetch using the latest bounds", async () => {
    vi.mocked(fetchSheltersWithinBounds).mockResolvedValue(response([shelter]))
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.requestBounds(otherBounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(fetchSheltersWithinBounds).toHaveBeenCalledTimes(1)
    expect(fetchSheltersWithinBounds).toHaveBeenCalledWith(otherBounds, expect.anything())
  })

  it("aborts a stale in-flight request when bounds change again after the debounce fires", async () => {
    let firstSignal: AbortSignal | undefined
    vi.mocked(fetchSheltersWithinBounds).mockImplementation((_bounds, signal) => {
      firstSignal = signal
      return new Promise(() => {}) // never resolves on its own
    })
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    await act(() => vi.advanceTimersByTimeAsync(400))
    expect(firstSignal?.aborted).toBe(false)

    vi.mocked(fetchSheltersWithinBounds).mockResolvedValue(response([shelter]))
    act(() => result.current.requestBounds(otherBounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(firstSignal?.aborted).toBe(true)
    expect(result.current.state).toEqual({ status: "ready", shelters: [shelter] })
  })

  it("ignores a rejection from a request that was superseded before it settled", async () => {
    let rejectFirst: (error: unknown) => void = () => {}
    vi.mocked(fetchSheltersWithinBounds).mockImplementationOnce(
      () => new Promise((_resolve, reject) => (rejectFirst = reject))
    )
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    vi.mocked(fetchSheltersWithinBounds).mockResolvedValue(response([shelter]))
    act(() => result.current.requestBounds(otherBounds))
    await act(() => vi.advanceTimersByTimeAsync(400))
    expect(result.current.state).toEqual({ status: "ready", shelters: [shelter] })

    rejectFirst(new Error("stale network error"))
    await Promise.resolve()

    expect(result.current.state).toEqual({ status: "ready", shelters: [shelter] })
  })

  it("surfaces a fetch error as state.status error", async () => {
    const error = new Error("network down")
    vi.mocked(fetchSheltersWithinBounds).mockRejectedValue(error)
    const { result } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    await act(() => vi.advanceTimersByTimeAsync(400))

    expect(result.current.state).toEqual({ status: "error", error })
  })

  it("clears its pending debounce timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout")
    const { result, unmount } = renderHook(() => useSheltersWithinBounds())

    act(() => result.current.requestBounds(bounds))
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(fetchSheltersWithinBounds).not.toHaveBeenCalled()
  })
})
