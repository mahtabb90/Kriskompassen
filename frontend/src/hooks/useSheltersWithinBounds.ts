import { useCallback, useEffect, useRef, useState } from "react"
import { fetchSheltersWithinBounds, type ShelterBounds } from "../services/shelterService"
import { cacheShelters } from "../services/shelterStorageService"
import type { Shelter } from "../types/shelter"

export type SheltersWithinBoundsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; shelters: Shelter[] }
  | { status: "error"; error: unknown }

export interface UseSheltersWithinBoundsResult {
  state: SheltersWithinBoundsState
  requestBounds: (bounds: ShelterBounds) => void
}

const DEBOUNCE_MS = 400

/**
 * Fetches shelters for a map viewport, debounced so a fast pan/zoom doesn't fire one request
 * per frame. Only the latest call within the debounce window survives; an in-flight request
 * superseded by a newer one is aborted and its result discarded, mirroring useCrisisResource's
 * cancel-on-stale pattern. No debounce utility exists elsewhere in this codebase (hand-rolled
 * here rather than adding a new dependency for one setTimeout/clearTimeout pair).
 *
 * Every successful response is written through to the local shelter cache (cacheShelters), the
 * same one useNearestShelters writes through to - this is what lets ShelterDetailPage show a
 * shelter the user found by panning the map, not just one of their 5 nearest.
 *
 * Always online-only by construction - only ever called from a map mounted behind an
 * online-only page gate - so there is no internal mode branching, unlike useNearestShelters.
 */
export function useSheltersWithinBounds(): UseSheltersWithinBoundsResult {
  const [state, setState] = useState<SheltersWithinBoundsState>({ status: "idle" })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const requestBounds = useCallback((bounds: ShelterBounds) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      setState({ status: "loading" })
      fetchSheltersWithinBounds(bounds, controller.signal)
        .then((response) => {
          // Written through regardless of whether this request was since superseded - the
          // shelter detail page (ShelterDetailPage.tsx) has no backend lookup of its own and
          // depends entirely on this cache, so every shelter the map ever showed should stay
          // reachable there, not just the ones from the viewport that happened to render last.
          void cacheShelters(response.shelters)
          if (controller.signal.aborted) return
          setState({ status: "ready", shelters: response.shelters })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setState({ status: "error", error })
        })
    }, DEBOUNCE_MS)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      controllerRef.current?.abort()
    },
    []
  )

  return { state, requestBounds }
}
