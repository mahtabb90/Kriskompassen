import { useCallback, useEffect, useRef, useState } from "react"
import {
  getSavedShelters,
  removeSavedShelter,
  saveShelter,
  setSavedShelterComment,
} from "../services/shelterStorageService"
import type { SavedShelter, Shelter } from "../types/shelter"

interface State {
  shelters: SavedShelter[]
  loading: boolean
}

/**
 * Owns the device-local list of bookmarked shelters, backed by IndexedDB (AGENTS.md §9).
 *
 * Loads once on mount; every mutation re-reads the full list afterward so every consumer (the
 * shelter detail view's save button and the "Mina skyddsrum" section) stays in sync without
 * duplicating storage reads. Mirrors useSavedAddresses's shape.
 */
export function useSavedShelters() {
  const [state, setState] = useState<State>({ shelters: [], loading: true })
  const mounted = useRef(false)

  const refresh = useCallback(async () => {
    const shelters = await getSavedShelters()
    if (mounted.current) setState({ shelters, loading: false })
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => {
      mounted.current = false
    }
  }, [refresh])

  const save = useCallback(
    async (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">) => {
      await saveShelter(shelter)
      await refresh()
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      await removeSavedShelter(id)
      await refresh()
    },
    [refresh]
  )

  const updateComment = useCallback(
    async (id: string, comment: string) => {
      await setSavedShelterComment(id, comment)
      await refresh()
    },
    [refresh]
  )

  return {
    shelters: state.shelters,
    loading: state.loading,
    isSaved: (id: string) => state.shelters.some((shelter) => shelter.id === id),
    save,
    remove,
    updateComment,
  }
}
