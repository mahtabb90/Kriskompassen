import { useCallback, useEffect, useRef, useState } from "react"
import {
  getSavedShelters,
  removeSavedShelter,
  saveShelter,
  setSavedShelterComment,
  setSavedShelterMapImage,
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

  const saveMapImage = useCallback(
    async (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">, image: Blob) => {
      // Only saves the bookmark when it doesn't exist yet - saveShelter() always overwrites the
      // whole record, which would silently wipe an existing comment on a shelter saved earlier.
      const alreadySaved = state.shelters.some((saved) => saved.id === shelter.id)
      if (!alreadySaved) await saveShelter(shelter)
      await setSavedShelterMapImage(shelter.id, image)
      await refresh()
    },
    [refresh, state.shelters]
  )

  return {
    shelters: state.shelters,
    loading: state.loading,
    isSaved: (id: string) => state.shelters.some((shelter) => shelter.id === id),
    save,
    remove,
    updateComment,
    saveMapImage,
  }
}
