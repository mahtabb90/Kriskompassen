import "maplibre-gl/dist/maplibre-gl.css"
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  LngLatBounds,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from "maplibre-gl"
import type { Feature, FeatureCollection, Point } from "geojson"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAddresses } from "../context/addressContext"
import type { NearestShelter } from "../hooks/useNearestShelters"
import { useSheltersWithinBounds } from "../hooks/useSheltersWithinBounds"
// Importing mapConfig also runs its setWorkerUrl() side effect exactly once, fixing a
// documented Vite+MapLibre v6 worker-loading incompatibility - see mapConfig.ts.
import { mapConfig } from "../config/mapConfig"
import type { Shelter } from "../types/shelter"
import type { GeoPoint } from "../utils/distance"
import { registerShelterIcons, shelterIconIdFor } from "../utils/shelterMapImages"
import { originMarkerElement } from "../utils/shelterMapIcons"
import { buildPopupContent, observePopupLayout } from "./shelterMapPopup"

/** The map's own camera, independent of any particular shelter - round-tripped through
 * react-router's navigation state so a visit to a shelter's detail page can hand it back on
 * return (see ShelterDetailPage.tsx's "Tillbaka till kartan" link). */
export interface StoredMapView {
  center: GeoPoint
  zoom: number
}

interface AllSheltersMapProps {
  origin: GeoPoint | null
  nearestShelters: NearestShelter[]
  savedShelterIds: ReadonlySet<string>
  /** Resumes exactly where the user left off (see StoredMapView) instead of the usual
   * origin-based framing - set when arriving back from a shelter's detail page. */
  initialView?: StoredMapView
  /** Bumped by ShelterMapPage once per successful "Hämta aktuell position" fetch; recenters the
   * camera on `origin` without waiting for nearestShelters (unlike the one-time fit-to-nearest
   * effect below, which would race the async refetch). Not meant to fire for any other reason
   * origin might change. */
  recenterToken?: number
  /** Performs the actual SPA navigation - this component has no router context of its own
   * (its popups are plain DOM, not a React tree), so the caller (which does) does it. */
  onNavigate: (path: string, options?: { state?: unknown }) => void
  /** Backs the popup's save/remove button - same useSavedShelters() this component's
   * savedShelterIds marker-icon highlighting is already derived from (see ShelterMapPage.tsx). */
  isSaved: (id: string) => boolean
  save: (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">) => Promise<void>
  remove: (id: string) => Promise<void>
}

const SOURCE_ID = "shelters"
const CLUSTER_CIRCLE_LAYER_ID = "shelter-cluster-circles"
const CLUSTER_COUNT_LAYER_ID = "shelter-cluster-count"
const UNCLUSTERED_LAYER_ID = "shelter-icons"

/** Centers on Sweden as a whole when no active address is known - the map still works
 * nationally without one, just without any "nearest" highlighting or tight initial framing. */
const DEFAULT_CENTER: GeoPoint = { lat: 62.0, lon: 15.0 }
const DEFAULT_ZOOM = 4.5
/** Used only until the 5 nearest shelters arrive and fitBounds takes over (see the fit effect
 * below) - a reasonable city-level starting point for a known position. */
const LOCAL_ZOOM = 12

/**
 * Below this zoom, the visible area is large enough that fetching and clustering every shelter
 * in it would mean transferring a large fraction of the whole 63,000-shelter snapshot just to
 * show a handful of cluster circles - a real cost in payload size and client-side clustering
 * time, not just visual clutter. No fetch happens below this threshold; a hint tells the user to
 * zoom in instead. Chosen so the national default view (DEFAULT_ZOOM) starts gated, while a
 * region/county-level view already clears it.
 */
const MIN_ZOOM_FOR_SHELTERS = 6

type ShelterFeatureProperties = Pick<Shelter, "id" | "number" | "address" | "capacity" | "type"> & {
  iconId: string
}

function featureToShelter(feature: MapGeoJSONFeature): Shelter {
  const properties = feature.properties as ShelterFeatureProperties
  const [lon, lat] = (feature.geometry as Point).coordinates
  return {
    id: properties.id,
    number: properties.number,
    address: properties.address,
    lat,
    lon,
    capacity: properties.capacity,
    type: properties.type,
  }
}

type ShelterFeature = Feature<Point, ShelterFeatureProperties>
type ShelterFeatureCollection = FeatureCollection<Point, ShelterFeatureProperties>

function emptyFeatureCollection(): ShelterFeatureCollection {
  return { type: "FeatureCollection", features: [] }
}

function toFeatureCollection(
  shelters: Shelter[],
  nearestIds: ReadonlySet<string>,
  savedShelterIds: ReadonlySet<string>
): ShelterFeatureCollection {
  return {
    type: "FeatureCollection",
    features: shelters.map((shelter): ShelterFeature => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [shelter.lon, shelter.lat] },
      properties: {
        id: shelter.id,
        number: shelter.number,
        address: shelter.address,
        capacity: shelter.capacity,
        type: shelter.type,
        iconId: shelterIconIdFor(nearestIds.has(shelter.id), savedShelterIds.has(shelter.id)),
      },
    })),
  }
}

/**
 * Renders every shelter from the local snapshot on an interactive, clustered MapLibre GL map,
 * fetching shelters for the current viewport as the user pans/zooms (see
 * useSheltersWithinBounds) instead of loading all ~63,000 at once. Clustering is MapLibre's
 * built-in GeoJSONSource cluster:true (supercluster internally, GPU-rendered circle/symbol
 * layers), not per-shelter DOM Marker objects, which don't scale past a handful of points.
 *
 * This is the only shelter map in the app - it covers both the free-exploration case (no
 * origin, national view) and the "nearest shelters" case (origin known, highlighted and
 * fitBounds-framed), so neither "Skyddsrum i närheten" nor anywhere else needs its own separate
 * map anymore.
 *
 * Lazy-loaded by ShelterMapPage.tsx (React.lazy), so maplibre-gl is only fetched once a user
 * actually opens this page - never on first app load. Online-only by design: this component is
 * never mounted while offline (see ShelterMapPage.tsx).
 *
 * There is no list view to sync selection with here, so there is no selectedId/onSelect prop or
 * selection-ring layer - clicking a shelter only opens a popup.
 *
 * Initial camera: centers tightly on origin + the 5 nearest shelters once they arrive (fitBounds),
 * or on a fixed national view when there is no origin - unless initialView is given (returning
 * from a shelter's detail page), which always wins. Below MIN_ZOOM_FOR_SHELTERS, no viewport
 * fetch happens at all - see handleViewportChange.
 */
function AllSheltersMap({
  origin,
  nearestShelters,
  savedShelterIds,
  initialView,
  recenterToken = 0,
  onNavigate,
  isSaved,
  save,
  remove,
}: AllSheltersMapProps) {
  const { activeAddress } = useAddresses()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const { state: sheltersState, requestBounds } = useSheltersWithinBounds()
  const requestBoundsRef = useRef(requestBounds)
  const onNavigateRef = useRef(onNavigate)
  const activeAddressRef = useRef(activeAddress)
  const isSavedRef = useRef(isSaved)
  const saveRef = useRef(save)
  const removeRef = useRef(remove)
  useEffect(() => {
    requestBoundsRef.current = requestBounds
    onNavigateRef.current = onNavigate
    activeAddressRef.current = activeAddress
    isSavedRef.current = isSaved
    saveRef.current = save
    removeRef.current = remove
  }, [requestBounds, onNavigate, activeAddress, isSaved, save, remove])

  const initialCenter = initialView?.center ?? origin ?? DEFAULT_CENTER
  const initialZoom = initialView?.zoom ?? (origin ? LOCAL_ZOOM : DEFAULT_ZOOM)
  const [belowMinZoom, setBelowMinZoom] = useState(initialZoom < MIN_ZOOM_FOR_SHELTERS)
  // Resuming a stored view means the user deliberately picked that spot already - never
  // override it with the usual origin/5-nearest framing.
  const hasFitNearestRef = useRef(Boolean(initialView))

  const nearestIds = useMemo(
    () => new Set(nearestShelters.map((shelter) => shelter.id)),
    [nearestShelters]
  )
  const distanceById = useMemo(
    () => new Map(nearestShelters.map((shelter) => [shelter.id, shelter.distanceMeters])),
    [nearestShelters]
  )
  const distanceByIdRef = useRef(distanceById)
  useEffect(() => {
    distanceByIdRef.current = distanceById
  }, [distanceById])

  // Creates the map once; recreating it on every prop change would discard the user's own pan
  // and zoom. Mirrors ShelterMap.tsx's setup effect.
  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: mapConfig.styleUrl,
      center: [initialCenter.lon, initialCenter.lat],
      zoom: initialZoom,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ showCompass: false }), "top-right")
    map.scrollZoom.disable()
    mapRef.current = map

    const handleViewportChange = () => {
      if (map.getZoom() < MIN_ZOOM_FOR_SHELTERS) {
        setBelowMinZoom(true)
        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
        source?.setData(emptyFeatureCollection())
        return
      }
      setBelowMinZoom(false)
      const bounds = map.getBounds()
      requestBoundsRef.current({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }
    map.on("moveend", handleViewportChange)
    map.on("zoomend", handleViewportChange)

    const handleClusterClick = (event: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_CIRCLE_LAYER_ID] })
      const cluster = features[0]
      if (!cluster) return
      const source = map.getSource(SOURCE_ID) as GeoJSONSource
      const clusterId = cluster.properties?.cluster_id as number
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const [lon, lat] = (cluster.geometry as Point).coordinates
        map.easeTo({ center: [lon, lat], zoom })
      })
    }

    const handleShelterClick = (event: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [UNCLUSTERED_LAYER_ID] })
      if (features.length === 0) return
      const shelters = Array.from(
        new Map(
          features.map((feature) => [feature.properties?.id, featureToShelter(feature)])
        ).values()
      )
      // Captured now, not inside the click handler below - the map hasn't moved between
      // opening this popup and the user clicking "Visa detaljer" inside it.
      const center = map.getCenter()
      const mapView: StoredMapView = {
        center: { lat: center.lat, lon: center.lng },
        zoom: map.getZoom(),
      }
      const content = buildPopupContent(
        shelters,
        activeAddressRef.current?.municipality,
        distanceByIdRef.current,
        (path) => onNavigateRef.current(path, { state: { mapView } }),
        (id) => isSavedRef.current(id),
        (shelter) => saveRef.current(shelter),
        (id) => removeRef.current(id)
      )
      const popup = new Popup().setLngLat(event.lngLat).setDOMContent(content).addTo(map)
      observePopupLayout(map, popup, content)
    }

    const setCursor = (cursor: string) => () => {
      map.getCanvas().style.cursor = cursor
    }
    for (const layerId of [CLUSTER_CIRCLE_LAYER_ID, UNCLUSTERED_LAYER_ID]) {
      map.on("mouseenter", layerId, setCursor("pointer"))
      map.on("mouseleave", layerId, setCursor(""))
    }
    map.on("click", CLUSTER_CIRCLE_LAYER_ID, handleClusterClick)
    map.on("click", UNCLUSTERED_LAYER_ID, handleShelterClick)

    map.on("load", () => {
      registerShelterIcons(map).then(() => {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14,
        })
        map.addLayer({
          id: CLUSTER_CIRCLE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#60A5FA",
              50,
              "#3B82F6",
              200,
              "#1E3A8A",
            ],
            "circle-radius": ["step", ["get", "point_count"], 16, 50, 20, 200, 26],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        })
        map.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
          paint: { "text-color": "#ffffff" },
        })
        map.addLayer({
          id: UNCLUSTERED_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          layout: { "icon-image": ["get", "iconId"], "icon-allow-overlap": true, "icon-size": 0.7 },
        })
        handleViewportChange()
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Deliberately runs once: initialCenter/initialZoom only matter at construction time here
    // (the fit-to-nearest effect below takes over afterwards), and nearestShelters/
    // savedShelterIds are read via refs/the data-sync effect below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keeps the origin marker in sync with a later origin change (e.g. a newly fetched live
  // position from the "Hämta aktuell position" button) - the map itself, created once above,
  // never reacts to origin on its own. Keyed on the coordinates, not origin's object identity
  // (see useNearestShelters.ts's own comment on this) - an unrelated re-render that just
  // rebuilds the origin object literal must not tear the marker down and recreate it.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !origin) return
    const marker = new Marker({ element: originMarkerElement() })
      .setLngLat([origin.lon, origin.lat])
      .setPopup(new Popup({ closeButton: false }).setText("Din position"))
      .addTo(map)
    return () => {
      marker.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lon])

  // Fires exactly once per successful "Hämta aktuell position" fetch (see useCurrentPosition's
  // own recenterToken), not on every origin change - deliberately not reused for the
  // fit-to-nearest effect below, which depends on the async nearestShelters refetch that would
  // race/lag behind a freshly fetched position. A plain flyTo to the raw point satisfies
  // "centrera kartan på den nya punkten" without that race; the nearest-shelter highlighting
  // still updates for free via the data-sync effect once the nearestShelters prop changes.
  const previousRecenterTokenRef = useRef(recenterToken)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !origin) return
    if (recenterToken === previousRecenterTokenRef.current) return
    previousRecenterTokenRef.current = recenterToken
    map.flyTo({ center: [origin.lon, origin.lat], zoom: LOCAL_ZOOM })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken, origin?.lat, origin?.lon])

  // Syncs the GeoJSON source whenever a new viewport fetch resolves, or the nearest/saved sets
  // change (e.g. a shelter gets bookmarked while this page is open).
  useEffect(() => {
    const map = mapRef.current
    if (!map || sheltersState.status !== "ready") return
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return
    source.setData(toFeatureCollection(sheltersState.shelters, nearestIds, savedShelterIds))
  }, [sheltersState, nearestIds, savedShelterIds])

  // Tightens the initial view to origin + the 5 nearest shelters once they arrive (async, via
  // useNearestShelters) - mirrors the old ShelterMap.tsx's hasFitBoundsRef pattern. Fires at most
  // once; fitBounds itself triggers moveend, which naturally re-runs handleViewportChange for the
  // tighter area. Never re-fits on a later refetch (e.g. the user's position changing) - the map
  // is the user's own to pan/zoom freely from here on.
  useEffect(() => {
    const map = mapRef.current
    if (!map || hasFitNearestRef.current || !origin || nearestShelters.length === 0) return
    hasFitNearestRef.current = true
    const bounds = new LngLatBounds([origin.lon, origin.lat], [origin.lon, origin.lat])
    for (const shelter of nearestShelters) bounds.extend([shelter.lon, shelter.lat])
    map.fitBounds(bounds, { padding: 48 })
  }, [origin, nearestShelters])

  return (
    <div
      role="group"
      aria-label="Karta över alla skyddsrum i Sverige"
      // isolate gives this wrapper its own stacking context, so the z-10 hint below only
      // competes against its own siblings here, never against unrelated fixed chrome
      // elsewhere on the page (e.g. MobileFooter) - see KAN-185.
      className="relative isolate h-[70vh] min-h-96 w-full overflow-hidden rounded-2xl border border-blue-200/80"
    >
      <div ref={containerRef} className="h-full w-full" />
      {belowMinZoom && (
        <p
          role="status"
          className="absolute inset-x-4 top-4 z-10 rounded-xl bg-white/95 px-4 py-2 text-center text-sm font-semibold text-blue-900 shadow-sm"
        >
          Zooma in för att se skyddsrum på kartan.
        </p>
      )}
      {/* Bottom-left, not bottom-right - MapLibre's own compact attribution control already
          lives in that corner (see attributionControl above), and this avoids the pixel math
          of stacking a plain React-rendered button next to it. Hidden entirely without an
          origin - there's nothing to recenter on. A plain easeTo keeps the user's current zoom
          (unlike recenterToken's flyTo, which resets to LOCAL_ZOOM for a freshly fetched
          position) - this button only snaps back to a marker the user panned away from. */}
      {origin && (
        <button
          type="button"
          onClick={() => mapRef.current?.easeTo({ center: [origin.lon, origin.lat] })}
          aria-label="Centrera på min position"
          className="absolute bottom-4 left-4 z-10 flex min-h-12 min-w-12 items-center justify-center rounded-full border border-blue-200/80 bg-white text-blue-900 shadow-sm hover:bg-blue-50"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-6"
          >
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default AllSheltersMap
