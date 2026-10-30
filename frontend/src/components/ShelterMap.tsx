import "maplibre-gl/dist/maplibre-gl.css"
import { Map as MapLibreMap, Marker, NavigationControl, Popup, LngLatBounds } from "maplibre-gl"
import { useEffect, useMemo, useRef } from "react"
import { useAddresses } from "../context/addressContext"
import type { NearestShelter } from "../hooks/useNearestShelters"
// Importing mapConfig also runs its setWorkerUrl() side effect exactly once, fixing a
// documented Vite+MapLibre v6 worker-loading incompatibility - see mapConfig.ts.
import { mapConfig } from "../config/mapConfig"
import { describeShelterLocation } from "../utils/shelterLabel"
import { formatDistanceMeters, type GeoPoint } from "../utils/distance"
import { originMarkerElement, shelterMarkerElement } from "../utils/shelterMapIcons"

interface ShelterMapProps {
  origin: GeoPoint
  shelters: NearestShelter[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Performs the actual SPA navigation - this component has no router context of its own
   * (its markers/popups are plain DOM, not a React tree), so the caller (which does) does it. */
  onNavigate: (path: string) => void
}

interface ShelterGroup {
  /** Shelters sharing (practically) the same coordinate - MCF genuinely registers several
   * shelters under one shared property, sometimes with identical coordinates. */
  key: string
  lat: number
  lon: number
  shelters: NearestShelter[]
}

function groupByCoordinate(shelters: NearestShelter[]): ShelterGroup[] {
  const groups = new Map<string, ShelterGroup>()
  for (const shelter of shelters) {
    const key = `${shelter.lat.toFixed(6)},${shelter.lon.toFixed(6)}`
    const existing = groups.get(key)
    if (existing) {
      existing.shelters.push(shelter)
    } else {
      groups.set(key, { key, lat: shelter.lat, lon: shelter.lon, shelters: [shelter] })
    }
  }
  return Array.from(groups.values())
}

/**
 * Builds one group's popup content as plain DOM - not a React render - since the popup is
 * attached to the map outside React's tree, where react-router's context (needed by a real
 * navigation link) is not available. "Visa detaljer" is a real `<a>` (so it still looks and
 * behaves like a link - right-click, open in new tab, etc. all work), but a plain click is
 * intercepted to navigate through the app's own router via onNavigate instead of reloading.
 */
function buildPopupContent(
  group: ShelterGroup,
  municipality: string | null | undefined,
  onSelect: (id: string) => void,
  onNavigate: (path: string) => void
): HTMLElement {
  const container = document.createElement("div")
  container.className = "flex flex-col gap-3"
  for (const shelter of group.shelters) {
    const entry = document.createElement("div")
    entry.className = "flex flex-col gap-1"

    const locationButton = document.createElement("button")
    locationButton.type = "button"
    locationButton.className = "text-left font-semibold text-blue-900 hover:underline"
    locationButton.textContent = describeShelterLocation(shelter, municipality)
    locationButton.addEventListener("click", () => onSelect(shelter.id))
    entry.appendChild(locationButton)

    if (shelter.number) {
      const number = document.createElement("p")
      number.className = "text-sm"
      number.textContent = `Skyddsrumsnummer ${shelter.number}`
      entry.appendChild(number)
    }

    const distance = document.createElement("p")
    distance.className = "text-sm"
    distance.textContent = formatDistanceMeters(shelter.distanceMeters)
    entry.appendChild(distance)

    const detailsLink = document.createElement("a")
    detailsLink.href = `/skyddsrum/${shelter.id}`
    detailsLink.textContent = "Visa detaljer"
    detailsLink.className = "text-sm font-semibold text-blue-900 underline underline-offset-2"
    detailsLink.addEventListener("click", (event) => {
      event.preventDefault()
      onNavigate(`/skyddsrum/${shelter.id}`)
    })
    entry.appendChild(detailsLink)

    container.appendChild(entry)
  }
  return container
}

/**
 * Renders the nearest shelters and the user's own position on an interactive MapLibre GL map,
 * with OpenFreeMap's free, key-less vector tiles - no account, no request quota, unlike a
 * key-based raster provider. The tradeoff (no SLA, single-maintainer, donation-funded service)
 * was weighed and accepted; see mapConfig.ts.
 *
 * Lazy-loaded by ShelterPage.tsx (React.lazy), so maplibre-gl is only fetched once a user
 * actually switches to the map view - never on first page load. Online-only by design: this
 * component is never mounted while offline (see ShelterPage.tsx), since map tiles require a
 * network request and are not cached for offline use in this MVP.
 *
 * Uses plain maplibre-gl (no React wrapper), matching the pattern already established in the
 * KrisKompassen team's sister project (IntresseKlubben)'s LocationPickerMap.jsx: a container
 * ref, a map ref, and callbacks kept in refs so imperative event handlers always call the
 * latest prop without needing to recreate the map or its markers.
 *
 * Shelters sharing the same coordinate (a real MCF data pattern - several shelters registered
 * under one property) are grouped into a single marker whose popup lists every one of them,
 * each still individually selectable. The nearest shelter (shelters[0] - the list is already
 * sorted by distance) always gets a visually distinct marker, independent of selection.
 */
function ShelterMap({ origin, shelters, selectedId, onSelect, onNavigate }: ShelterMapProps) {
  const { activeAddress } = useAddresses()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const hasFitBoundsRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  const onNavigateRef = useRef(onNavigate)
  // Keeps the refs current without writing to them during render (unsafe under concurrent
  // rendering - a render can be discarded or run more than once before it ever commits).
  useEffect(() => {
    onSelectRef.current = onSelect
    onNavigateRef.current = onNavigate
  }, [onSelect, onNavigate])

  const groups = useMemo(() => groupByCoordinate(shelters), [shelters])
  const nearestId = shelters[0]?.id ?? null

  // Creates the map once; recreating it on every prop change would discard the user's own pan
  // and zoom. Mirrors IntresseKlubben's LocationPickerMap.jsx exactly.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapConfig.styleUrl,
      center: [origin.lon, origin.lat],
      zoom: 14,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), "top-right")
    // Avoids trapping page scroll under the map on desktop; touch pinch-zoom is unaffected.
    map.scrollZoom.disable()
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Syncs markers imperatively whenever the shelter set or selection changes - maplibre-gl
  // markers are not React elements, so this replaces react-leaflet's declarative <Marker> loop.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    for (const marker of markersRef.current) marker.remove()
    markersRef.current = []

    const originMarker = new Marker({ element: originMarkerElement() })
      .setLngLat([origin.lon, origin.lat])
      .setPopup(new Popup({ closeButton: false }).setText("Din position"))
      .addTo(map)
    markersRef.current.push(originMarker)

    for (const group of groups) {
      const isNearest = group.shelters.some((shelter) => shelter.id === nearestId)
      const isSelected = group.shelters.some((shelter) => shelter.id === selectedId)
      const marker = new Marker({ element: shelterMarkerElement({ isNearest, isSelected }) })
        .setLngLat([group.lon, group.lat])
        .setPopup(
          new Popup().setDOMContent(
            buildPopupContent(
              group,
              activeAddress?.municipality,
              (id) => onSelectRef.current(id),
              (path) => onNavigateRef.current(path)
            )
          )
        )
        .addTo(map)
      // A single-shelter group selects itself directly on click, in addition to opening its
      // popup (which setPopup above already wires up); a group defers to its popup's list.
      if (group.shelters.length === 1) {
        marker
          .getElement()
          .addEventListener("click", () => onSelectRef.current(group.shelters[0].id))
      }
      markersRef.current.push(marker)
    }

    if (!hasFitBoundsRef.current && shelters.length > 0) {
      hasFitBoundsRef.current = true
      const bounds = new LngLatBounds([origin.lon, origin.lat], [origin.lon, origin.lat])
      for (const shelter of shelters) bounds.extend([shelter.lon, shelter.lat])
      map.fitBounds(bounds, { padding: 48 })
    }
    // activeAddress is read for popup text only, not a dependency that should re-sync markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, nearestId, selectedId, origin.lat, origin.lon, shelters])

  return (
    <div
      role="group"
      aria-label="Karta över de närmaste skyddsrummen"
      className="relative overflow-hidden rounded-2xl border border-blue-200/80"
    >
      <div ref={containerRef} className="h-96 w-full" />
      <button
        type="button"
        onClick={() => mapRef.current?.flyTo({ center: [origin.lon, origin.lat] })}
        aria-label="Centrera kartan på min position"
        title="Centrera kartan på min position"
        className="absolute right-3 bottom-3 z-10 inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white text-blue-900 shadow-sm hover:bg-blue-50"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  )
}

export default ShelterMap
