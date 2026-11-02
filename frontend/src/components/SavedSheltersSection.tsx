import { useEffect, useState } from "react"
import { getAllCachedShelters } from "../services/shelterStorageService"
import type { SavedShelter, Shelter } from "../types/shelter"
import { haversineDistanceMeters, type GeoPoint } from "../utils/distance"
import ShelterListItem from "./ShelterListItem"

const panelClassName =
  "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

interface SavedSheltersSectionProps {
  origin: GeoPoint | null
  savedShelters: SavedShelter[]
  loading: boolean
  onRemove: (id: string) => void
}

/**
 * Lists the shelters the user has bookmarked on this device, as the "Sparade skyddsrum" tab's
 * content on ShelterPage.
 *
 * Takes the saved list and loading flag as props, sharing one useSavedShelters instance with the
 * nearest-shelters tab - a save/remove made from either place must be reflected in both without
 * each holding its own stale copy.
 *
 * Enriches each bookmark with the fuller cached shelter record (type, capacity, number) when
 * one is available, falling back to the address/coordinates captured at save time otherwise -
 * e.g. if the shelter has since dropped out of the local cache. Distance is shown only when the
 * user's position is known; the section itself works regardless and is unaffected by the
 * online/offline mode toggle, since bookmarks are always local.
 */
function SavedSheltersSection({
  origin,
  savedShelters,
  loading,
  onRemove,
}: SavedSheltersSectionProps) {
  const [cachedById, setCachedById] = useState<Map<string, Shelter>>(new Map())

  useEffect(() => {
    let active = true
    void getAllCachedShelters().then((cached) => {
      if (active) setCachedById(new Map(cached.map((shelter) => [shelter.id, shelter])))
    })
    return () => {
      active = false
    }
  }, [savedShelters])

  if (loading) return null

  if (savedShelters.length === 0) {
    return (
      <p role="status" className={panelClassName}>
        Inga skyddsrum sparade än. Spara ett skyddsrum från dess detaljvy för att se det här.
      </p>
    )
  }

  return (
    <ul aria-label="Sparade skyddsrum" className="mt-6 grid gap-6 sm:grid-cols-2">
      {savedShelters.map((saved) => {
        const shelter: Shelter = cachedById.get(saved.id) ?? {
          id: saved.id,
          number: null,
          address: saved.address,
          lat: saved.lat,
          lon: saved.lon,
          capacity: null,
          type: null,
        }
        return (
          <ShelterListItem
            key={saved.id}
            shelter={shelter}
            distanceMeters={origin ? haversineDistanceMeters(origin, shelter) : undefined}
            saved
            onToggleSave={() => onRemove(saved.id)}
            comment={saved.comment}
          />
        )
      })}
    </ul>
  )
}

export default SavedSheltersSection
