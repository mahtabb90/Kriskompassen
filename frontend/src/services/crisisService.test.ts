import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { crisisArticles, crisisItems, crisisResponse } from "./__fixtures__/crisis"
import { CrisisResponseValidationError } from "./crisisResponseValidator"
import { CrisisRequestError, fetchCrisisItem, fetchCrisisItems } from "./crisisService"

let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => crisisResponse(input))
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("article transport", () => {
  it("fetches full articles without credentials or cache and initializes only local flags", async () => {
    await expect(fetchCrisisItems()).resolves.toEqual(crisisItems)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(apiConfig.crisisUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    })
  })

  it("fetches a detail and preserves full article text", async () => {
    await expect(fetchCrisisItem(crisisItems[0].id)).resolves.toEqual(crisisItems[0])
  })

  it("does not import saving metadata from the API", async () => {
    fetchMock.mockResolvedValue(
      Response.json([{ ...crisisArticles[0], savedOffline: true, savedAt: "remote" }])
    )
    await expect(fetchCrisisItems()).resolves.toEqual([crisisItems[0]])
  })

  it("accepts an empty list", async () => {
    fetchMock.mockResolvedValue(Response.json([]))
    await expect(fetchCrisisItems()).resolves.toEqual([])
  })

  it("returns undefined only for a documented detail 404 and encodes the requested ID", async () => {
    await expect(fetchCrisisItem("missing /?id")).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][0]).toBe(`${apiConfig.crisisUrl}/missing%20%2F%3Fid`)
  })

  it.each([
    { detail: "Not Found" },
    { error: { code: "other", message: "Fel" } },
    { error: { code: "crisis_not_found", message: "" } },
  ])("rejects an unrelated JSON 404: %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body, { status: 404 }))
    await expect(fetchCrisisItem("missing")).rejects.toMatchObject({ code: "http", status: 404 })
  })

  it("rejects a deployment's HTML 404", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Not Found</html>", { status: 404 }))
    await expect(fetchCrisisItem("missing")).rejects.toMatchObject({ code: "http", status: 404 })
  })

  it("does not accept not-found as a successful list result", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "crisis_not_found", message: "Saknas" } }, { status: 404 })
    )
    await expect(fetchCrisisItems()).rejects.toMatchObject({ code: "http", status: 404 })
  })

  it("rejects a detail with a different ID", async () => {
    fetchMock.mockResolvedValue(Response.json(crisisArticles[1]))
    await expect(fetchCrisisItem(crisisArticles[0].id)).rejects.toBeInstanceOf(
      CrisisResponseValidationError
    )
  })

  it("reports HTTP server failures", async () => {
    fetchMock.mockResolvedValue(new Response("Internal error", { status: 500 }))
    await expect(fetchCrisisItems()).rejects.toMatchObject({ code: "http", status: 500 })
  })

  it("reports network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(fetchCrisisItems()).rejects.toMatchObject({ code: "network" })
  })

  it("reports a successful HTTP response containing HTML as invalid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Login</html>"))
    await expect(fetchCrisisItems()).rejects.toMatchObject({ code: "invalid_json" })
  })

  it("rejects malformed successful responses", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: [] }))
    await expect(fetchCrisisItems()).rejects.toBeInstanceOf(CrisisResponseValidationError)
  })
})

describe("article cancellation and deadlines", () => {
  beforeEach(() => vi.useFakeTimers())

  it("does not start I/O for an already cancelled signal", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchCrisisItems(controller.signal)).rejects.toMatchObject({ code: "aborted" })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("settles a cancelled request even if fetch ignores its signal", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    const controller = new AbortController()
    const failure = expect(fetchCrisisItems(controller.signal)).rejects.toMatchObject({
      code: "aborted",
    })
    controller.abort()
    await failure
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("enforces the full deadline while waiting for headers", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    const failure = expect(fetchCrisisItems()).rejects.toMatchObject({ code: "timeout" })
    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs - 1)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await failure
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([200, 404])(
    "enforces the deadline while reading an unfinished HTTP %i body",
    async (status) => {
      let body: ReadableStreamDefaultController<Uint8Array> | undefined
      fetchMock.mockResolvedValue(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              body = controller
              controller.enqueue(new TextEncoder().encode("{"))
            },
          }),
          { status }
        )
      )
      const failure = expect(fetchCrisisItem("missing")).rejects.toMatchObject({ code: "timeout" })
      await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
      await failure
      expect(vi.getTimerCount()).toBe(0)
      body?.close()
    }
  )

  it("cleans up a completed request without cancelling a concurrent one", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json(crisisArticles))
      .mockImplementationOnce(() => new Promise(() => {}))
    const completed = fetchCrisisItems()
    const pending = fetchCrisisItems()
    const failure = expect(pending).rejects.toBeInstanceOf(CrisisRequestError)
    await expect(completed).resolves.toEqual(crisisItems)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)
    await failure
    expect(vi.getTimerCount()).toBe(0)
  })
})
