import "maplibre-gl/dist/maplibre-gl.css"
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds } from "maplibre-gl"
import { useEffect, useRef } from "react"
// Importing mapConfig also runs its setWorkerUrl() side effect exactly once, fixing a
// documented Vite+MapLibre v6 worker-loading incompatibility - see mapConfig.ts.
import { mapConfig } from "../config/mapConfig"
import type { Shelter } from "../types/shelter"
import type { GeoPoint } from "../utils/distance"
import { originMarkerElement, shelterMarkerElement } from "../utils/shelterMapIcons"

interface ShelterLocationMapProps {
  shelter: Pick<Shelter, "lat" | "lon">
  /** The user's own position, when known. Omitted entirely (no marker, no implied claim about
   * "your position") when there is no active address - unlike ShelterMap.tsx's nearest-shelters
   * list, this page is reachable without one. */
  origin: GeoPoint | null
}

/**
 * Shows one shelter's exact location on an interactive MapLibre GL map - replaces the previous
 * external OpenStreetMap link on ShelterDetailPage.tsx.
 *
 * A simpler sibling of ShelterMap.tsx: no popups, selection sync or coordinate clustering, since
 * there is always exactly one shelter here. See ShelterMap.tsx for the shared reasoning behind
 * the library/tile choice (MapLibre GL + OpenFreeMap: free, key-less, no quota) and why markers
 * are synced in their own effect rather than recreated with the map.
 */
function ShelterLocationMap({ shelter, origin }: ShelterLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapConfig.styleUrl,
      center: [shelter.lon, shelter.lat],
      zoom: 15,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), "top-right")
    map.scrollZoom.disable()
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const shelterMarker = new Marker({
      element: shelterMarkerElement({ isNearest: false, isSelected: false }),
    })
      .setLngLat([shelter.lon, shelter.lat])
      .addTo(map)

    const originMarker = origin
      ? new Marker({ element: originMarkerElement() })
          .setLngLat([origin.lon, origin.lat])
          .addTo(map)
      : null

    if (origin) {
      const bounds = new LngLatBounds([shelter.lon, shelter.lat], [shelter.lon, shelter.lat])
      bounds.extend([origin.lon, origin.lat])
      map.fitBounds(bounds, { padding: 48, maxZoom: 16 })
    } else {
      map.setCenter([shelter.lon, shelter.lat])
    }

    return () => {
      shelterMarker.remove()
      originMarker?.remove()
    }
    // Depends on origin's scalar fields, not the object itself, since ShelterDetailPage builds
    // a new origin object every render - depending on the object would rebuild these markers on
    // every keystroke in the comment field above, not just when the position actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelter.lat, shelter.lon, origin?.lat, origin?.lon])

  return (
    <div
      role="group"
      aria-label="Karta över skyddsrummets plats"
      className="relative overflow-hidden rounded-2xl border border-blue-200/80"
    >
      <div ref={containerRef} className="h-64 w-full" />
    </div>
  )
}

export default ShelterLocationMap
