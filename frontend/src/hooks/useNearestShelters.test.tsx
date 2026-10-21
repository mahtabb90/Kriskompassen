// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ModeContext, type Mode } from "../context/modeContext"
import { fetchNearestShelters } from "../services/shelterService"
import { cacheShelters, getAllCachedShelters } from "../services/shelterStorageService"
import type { Shelter, ShelterListResponse } from "../types/shelter"
import { useNearestShelters } from "./useNearestShelters"

vi.mock("../services/shelterService", () => ({ fetchNearestShelters: vi.fn() }))
vi.mock("../services/shelterStorageService", () => ({
  cacheShelters: vi.fn(),
  getAllCachedShelters: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function wrapperFor(mode: Mode) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ModeContext.Provider
        value={{
          mode,
          isOnline: mode === "online",
          autoSwitchNotice: null,
          setMode: vi.fn(),
          dismissAutoSwitchNotice: vi.fn(),
        }}
      >
        {children}
      </ModeContext.Provider>
    )
  }
  return Wrapper
}

const shelterNear: Shelter = {
  id: "near",
  number: "100001-1",
  address: "A-vägen 1",
  lat: 59.001,
  lon: 18.0,
  capacity: 10,
  type: "Skyddsrum",
}
const shelterFar: Shelter = {
  id: "far",
  number: "100002-2",
  address: "B-vägen 2",
  lat: 59.1,
  lon: 18.0,
  capacity: 20,
  type: "Skyddsrum",
}

function response(shelters: Shelter[]): ShelterListResponse {
  return {
    shelters,
    source: {
      name: "MCF",
      url: "https://example.com",
      apiName: "WFS",
      apiUrl: "https://example.com/wfs",
    },
    bboxRadiusMetersUsed: 2000,
  }
}

describe("useNearestShelters online", () => {
  it("fetches, writes through to storage, and ranks the result by distance", async () => {
    vi.mocked(fetchNearestShelters).mockResolvedValue(response([shelterFar, shelterNear]))

    const { result } = renderHook(() => useNearestShelters({ lat: 59.0, lon: 18.0 }), {
      wrapper: wrapperFor("online"),
    })

    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    expect(result.current.state).toMatchObject({
      status: "ready",
      data: [{ id: "near" }, { id: "far" }],
    })
    expect(cacheShelters).toHaveBeenCalledExactlyOnceWith([shelterFar, shelterNear])
    expect(getAllCachedShelters).not.toHaveBeenCalled()
  })
})

describe("useNearestShelters offline", () => {
  it("reads from storage and ranks by distance, without any network call", async () => {
    vi.mocked(getAllCachedShelters).mockResolvedValue([shelterFar, shelterNear])

    const { result } = renderHook(() => useNearestShelters({ lat: 59.0, lon: 18.0 }), {
      wrapper: wrapperFor("offline"),
    })

    await waitFor(() => expect(result.current.state.status).toBe("ready"))
    expect(result.current.state).toMatchObject({ data: [{ id: "near" }, { id: "far" }] })
    expect(fetchNearestShelters).not.toHaveBeenCalled()
    expect(cacheShelters).not.toHaveBeenCalled()
  })
})

it("starts a fresh attempt when the position changes", async () => {
  vi.mocked(fetchNearestShelters)
    .mockResolvedValueOnce(response([shelterNear]))
    .mockResolvedValueOnce(response([shelterFar]))

  const { result, rerender } = renderHook(({ origin }) => useNearestShelters(origin), {
    wrapper: wrapperFor("online"),
    initialProps: { origin: { lat: 59.0, lon: 18.0 } },
  })
  await waitFor(() => expect(result.current.state).toMatchObject({ data: [{ id: "near" }] }))

  rerender({ origin: { lat: 60.0, lon: 19.0 } })

  expect(result.current.state.status).toBe("loading")
  await waitFor(() => expect(result.current.state).toMatchObject({ data: [{ id: "far" }] }))
  expect(fetchNearestShelters).toHaveBeenCalledTimes(2)
})
