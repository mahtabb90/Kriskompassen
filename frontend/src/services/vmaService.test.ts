import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiConfig } from "../config/apiConfig"
import { VmaResponseValidationError } from "./vmaResponseValidator"
import { fetchVmaResponse, fetchVmas, VmaRequestError } from "./vmaService"

import { alert as validRecord, feed, info, now, source } from "./__fixtures__/vma"

function requestSignal(options?: RequestInit): AbortSignal {
  if (!options?.signal) throw new Error("Expected a per-request abort signal.")
  return options.signal
}

let fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(Date, "now").mockReturnValue(now)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("fetchVmas", () => {
  it("requests the configured backend without credentials and maps validated messages", async () => {
    fetchMock.mockResolvedValue(Response.json(feed()))

    const result = await fetchVmas()

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(apiConfig.vmaUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: expect.any(AbortSignal),
    })
    expect(result).toMatchObject({
      messages: [
        {
          id: validRecord.identifier,
          title: info.event,
          content: info.description,
          source,
          status: "active",
        },
      ],
      rejectedCount: 0,
      excludedCount: 0,
      issues: [],
    })
  })

  it("represents a genuinely empty response as a successful result with no diagnostics", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([])))

    await expect(fetchVmas()).resolves.toEqual({
      source,
      feedUpdatedAt: new Date(now).toISOString(),
      evaluatedAt: new Date(now).toISOString(),
      messages: [],
      rejectedCount: 0,
      excludedCount: 0,
      issues: [],
    })
  })

  it("preserves usable messages and reports malformed and excluded peers separately", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        feed([validRecord, null, { identifier: "broken" }, { ...validRecord, status: "Test" }])
      )
    )

    const result = await fetchVmas()

    expect(result.messages.map((message) => message.id)).toEqual([validRecord.identifier])
    expect(result.rejectedCount).toBe(2)
    expect(result.excludedCount).toBe(1)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        { index: 1, field: "$", code: "invalid_record" },
        { index: 2, field: "sender", code: "invalid_required_field" },
      ])
    )
  })

  it("distinguishes technical-test exclusions from an empty upstream response", async () => {
    fetchMock.mockResolvedValue(Response.json(feed([{ ...validRecord, status: "Test" }])))

    await expect(fetchVmas()).resolves.toEqual({
      source,
      feedUpdatedAt: new Date(now).toISOString(),
      evaluatedAt: new Date(now).toISOString(),
      messages: [],
      rejectedCount: 0,
      excludedCount: 1,
      issues: [],
    })
  })

  it.each([
    { name: "an array of malformed records", response: feed([null, 1, {}]) },
    { name: "an object container", response: { messages: [] } },
    { name: "null", response: null },
  ])("rejects $name rather than returning an empty success", async ({ response }) => {
    fetchMock.mockResolvedValue(Response.json(response))

    await expect(fetchVmas()).rejects.toBeInstanceOf(VmaResponseValidationError)
  })

  it("omits malformed optional fields while retaining the message and its diagnostics", async () => {
    fetchMock.mockResolvedValue(
      Response.json(feed([{ ...validRecord, references: "invalid-reference" }]))
    )

    const result = await fetchVmas()

    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].references).toEqual([])
    expect(result.rejectedCount).toBe(0)
    expect(result.issues).toContainEqual({
      index: 0,
      field: "references",
      code: "invalid_optional_field",
    })
  })
})

describe("fetchVmaResponse", () => {
  it("leaves structural validation to its caller", async () => {
    fetchMock.mockResolvedValue(Response.json({ unexpected: "container" }))

    await expect(fetchVmaResponse()).resolves.toEqual({ unexpected: "container" })
  })

  it.each([502, 504])(
    "preserves HTTP %s as an HTTP failure and releases the request",
    async (status) => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValue(new Response("Upstream failure", { status }))

      await expect(fetchVmas()).rejects.toMatchObject({
        name: "VmaRequestError",
        code: "http",
        status,
      })
      expect(requestSignal(fetchMock.mock.calls[0][1]).aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it("preserves a network failure without converting it to successful empty data", async () => {
    const cause = new TypeError("Connection failed")
    fetchMock.mockRejectedValue(cause)

    await expect(fetchVmas()).rejects.toMatchObject({
      name: "VmaRequestError",
      code: "network",
      status: undefined,
      cause,
    })
  })

  it("reports malformed JSON separately from invalid response structure", async () => {
    fetchMock.mockResolvedValue(new Response("{"))

    await expect(fetchVmas()).rejects.toMatchObject({
      name: "VmaRequestError",
      code: "invalid_json",
      cause: expect.any(SyntaxError),
    })
  })

  it("aborts a request that has not received headers within the configured deadline", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          requestSignal(options).addEventListener("abort", () =>
            reject(new DOMException("", "AbortError"))
          )
        })
    )

    const request = fetchVmas()
    const failure = expect(request).rejects.toMatchObject({
      name: "VmaRequestError",
      code: "timeout",
    })
    const signal = requestSignal(fetchMock.mock.calls[0][1])

    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs - 1)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    await failure
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("applies the deadline while reading an unfinished response body", async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(async (_url, options) => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("["))
          requestSignal(options).addEventListener("abort", () =>
            controller.error(new DOMException("", "AbortError"))
          )
        },
      })
      return new Response(body)
    })

    const failure = expect(fetchVmas()).rejects.toMatchObject({
      name: "VmaRequestError",
      code: "timeout",
    })

    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)

    await failure
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cleans up a completed request without aborting or clearing another call's deadline", async () => {
    vi.useFakeTimers()
    const responses: Array<(response: Response) => void> = []
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((resolve, reject) => {
          responses.push(resolve)
          const signal = requestSignal(options)
          signals.push(signal)
          signal.addEventListener("abort", () => reject(new DOMException("", "AbortError")))
        })
    )

    const completed = fetchVmas()
    const pending = fetchVmas()
    const pendingFailure = expect(pending).rejects.toBeInstanceOf(VmaRequestError)
    const pendingTimeout = expect(pending).rejects.toMatchObject({ code: "timeout" })
    expect(signals[0]).not.toBe(signals[1])

    responses[0](Response.json(feed()))
    await expect(completed).resolves.toMatchObject({ messages: [{ id: validRecord.identifier }] })

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(apiConfig.timeoutMs)

    await pendingFailure
    await pendingTimeout
    expect(signals[1].aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
