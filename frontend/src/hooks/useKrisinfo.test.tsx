// @vitest-environment jsdom
import { StrictMode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { krisinfoSections, type KrisinfoSectionId } from "../content/krisinfo/index"
import { getKrisinfoSection, KrisinfoError } from "../services/krisinfoService"
import { useKrisinfo } from "./useKrisinfo"

vi.mock("../services/krisinfoService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/krisinfoService")>()
  return { ...actual, getKrisinfoSection: vi.fn(actual.getKrisinfoSection) }
})

const readSection = vi.mocked(getKrisinfoSection)

afterEach(() => {
  cleanup()
  readSection.mockClear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useKrisinfo", () => {
  it("starts loading and then returns the bundled section", async () => {
    const { result } = renderHook(() => useKrisinfo("phone-numbers"))
    expect(result.current.state).toEqual({ status: "loading" })
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        data: krisinfoSections["phone-numbers"],
      })
    )
    expect(readSection).toHaveBeenCalledWith("phone-numbers", expect.any(AbortSignal))
  })

  it("loads a new section afresh without showing the previous section's data", async () => {
    const { result, rerender } = renderHook(
      ({ sectionId }: { sectionId: KrisinfoSectionId }) => useKrisinfo(sectionId),
      { initialProps: { sectionId: "phone-numbers" } }
    )
    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    const firstSignal = readSection.mock.calls[0][1]

    rerender({ sectionId: "warning-signals" })
    expect(result.current.state).toEqual({ status: "loading" })
    expect(firstSignal?.aborted).toBe(true)
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        data: krisinfoSections["warning-signals"],
      })
    )
  })

  it("ignores a late result from a section that is no longer requested", async () => {
    let resolveLate!: (value: (typeof krisinfoSections)["phone-numbers"]) => void
    readSection.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLate = resolve
      })
    )
    const { result, rerender } = renderHook(
      ({ sectionId }: { sectionId: KrisinfoSectionId }) => useKrisinfo(sectionId),
      { initialProps: { sectionId: "phone-numbers" } }
    )
    rerender({ sectionId: "warning-signals" })
    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    await act(async () => resolveLate(krisinfoSections["phone-numbers"]))
    expect(result.current.state).toEqual({
      status: "ready",
      data: krisinfoSections["warning-signals"],
    })
  })

  it("exposes a failed read and recovers on retry", async () => {
    const failure = new KrisinfoError("unknown_section", "Unknown krisinfo section")
    readSection.mockRejectedValueOnce(failure)
    const { result } = renderHook(() => useKrisinfo("phone-numbers"))
    await waitFor(() => expect(result.current.state).toEqual({ status: "error", error: failure }))

    act(() => result.current.retry())
    expect(result.current.state).toEqual({ status: "loading", retrying: true })
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        data: krisinfoSections["phone-numbers"],
      })
    )
    expect(readSection).toHaveBeenCalledTimes(2)
  })

  it("works offline and without a mode provider or network request", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useKrisinfo("warning-signals"))
    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("settles in StrictMode with the current section", async () => {
    const { result } = renderHook(() => useKrisinfo("warning-signals"), { wrapper: StrictMode })
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: "ready",
        data: krisinfoSections["warning-signals"],
      })
    )
  })
})
