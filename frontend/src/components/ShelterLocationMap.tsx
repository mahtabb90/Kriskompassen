import "maplibre-gl/dist/maplibre-gl.css"
import { Map as MapLibreMap, Marker, NavigationControl, LngLatBounds } from "maplibre-gl"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
// Importing mapConfig also runs its setWorkerUrl() side effect exactly once, fixing a
// documented Vite+MapLibre v6 worker-loading incompatibility - see mapConfig.ts.
import { mapConfig } from "../config/mapConfig"
import type { Shelter } from "../types/shelter"
import type { GeoPoint } from "../utils/distance"
import { captureMapSnapshot, loadSvgImage, type MarkerSnapshot } from "../utils/mapSnapshot"
import {
  ORIGIN_MARKER_SIZE,
  ORIGIN_MARKER_SVG,
  originMarkerElement,
  SHELTER_MARKER_SIZE,
  SHELTER_MARKER_SVG,
  shelterMarkerElement,
} from "../utils/shelterMapIcons"

/**
 * "loading" until the style and its initial tiles have actually finished downloading, "ready"
 * once they have, "error" if a resource request failed. Distinct from ShelterDetailPage's
 * `mode === "online"` check: that only reflects `navigator.onLine` (is there a network
 * interface), not whether the tile host itself is reachable - a captive portal, DNS issue, or
 * outage at the tile host leaves `mode` saying "online" while this map never actually loads.
 */
export type ShelterLocationMapStatus = "loading" | "ready" | "error"

interface ShelterLocationMapProps {
  shelter: Pick<Shelter, "lat" | "lon">
  /** The user's own position, when known. Omitted entirely (no marker, no implied claim about
   * "your position") when there is no active address - this page is reachable without one. */
  origin: GeoPoint | null
  /** Reports the map's load status so the parent can keep "Spara kartbild" disabled until
   * there's an actual map to capture - without this, the button stayed clickable even when the
   * tile host was unreachable, silently saving a blank snapshot. */
  onStatusChange?: (status: ShelterLocationMapStatus) => void
}

/** Lets ShelterDetailPage save exactly the view the user panned/zoomed to, without reaching into
 * maplibre-gl internals itself. */
export interface ShelterLocationMapHandle {
  /** Captures the map's current on-screen view, downscaled per utils/mapSnapshot.ts. Resolves
   * null if the map isn't mounted yet, or hasn't reached "ready" (see ShelterLocationMapStatus) -
   * callers should prefer disabling their save action via onStatusChange instead of relying on
   * this, since by then the user has already clicked a seemingly-live button for nothing. */
  captureImage: () => Promise<Blob | null>
}

/**
 * Shows one shelter's exact location on an interactive MapLibre GL map - replaces the previous
 * external OpenStreetMap link on ShelterDetailPage.tsx.
 *
 * A simpler sibling of AllSheltersMap.tsx: no popups or clustering, since there is always
 * exactly one shelter here. Shares the library/tile choice (MapLibre GL + OpenFreeMap: free,
 * key-less, no quota) and the pattern of syncing markers in their own effect rather than
 * recreating them with the map.
 */
const ShelterLocationMap = forwardRef<ShelterLocationMapHandle, ShelterLocationMapProps>(
  function ShelterLocationMap({ shelter, origin, onStatusChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<MapLibreMap | null>(null)
    const statusRef = useRef<ShelterLocationMapStatus>("loading")
    // A ref, not an effect dependency, so the mount effect below can always call the latest
    // callback without needing onStatusChange in its deps (which would force it to recreate the
    // map - and therefore reload the style from scratch - on every parent re-render).
    const onStatusChangeRef = useRef(onStatusChange)
    onStatusChangeRef.current = onStatusChange

    useImperativeHandle(ref, () => ({
      captureImage: async () => {
        const map = mapRef.current
        if (!map || statusRef.current !== "ready") return null

        // map.getCanvas() alone never contains the shelter/origin markers - they're separate DOM
        // elements maplibre-gl positions on top of the canvas with CSS, not pixels drawn into it.
        // So each one is rasterized and composited back on manually, at its on-screen position.
        const canvas = map.getCanvas()
        // Canvas pixels are CSS pixels * pixel ratio (clamped by maxCanvasSize internally), while
        // map.project() returns CSS pixels - measuring both live, rather than trusting
        // map.getPixelRatio(), keeps this correct even when that clamp kicks in.
        const pixelRatio = canvas.width / canvas.clientWidth

        const toMarkerSnapshot = async (
          lngLat: [number, number],
          svg: string,
          size: number
        ): Promise<MarkerSnapshot> => {
          const point = map.project(lngLat)
          const image = await loadSvgImage(svg)
          return {
            x: point.x * pixelRatio,
            y: point.y * pixelRatio,
            image,
            width: size * pixelRatio,
            height: size * pixelRatio,
          }
        }

        const markers = await Promise.all([
          toMarkerSnapshot([shelter.lon, shelter.lat], SHELTER_MARKER_SVG, SHELTER_MARKER_SIZE),
          ...(origin
            ? [toMarkerSnapshot([origin.lon, origin.lat], ORIGIN_MARKER_SVG, ORIGIN_MARKER_SIZE)]
            : []),
        ])

        return captureMapSnapshot(canvas, markers)
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return
      const map = new MapLibreMap({
        container: containerRef.current,
        style: mapConfig.styleUrl,
        center: [shelter.lon, shelter.lat],
        zoom: 15,
        attributionControl: { compact: true },
        // Without this, the WebGL canvas's drawing buffer is cleared right after each frame is
        // presented - captureImage()'s drawImage()/toBlob() would then read a blank (black)
        // buffer instead of the rendered map, since that copy always happens later than the
        // frame that produced it.
        canvasContextAttributes: { preserveDrawingBuffer: true },
      })
      map.addControl(new NavigationControl({ showCompass: false }), "top-right")
      map.scrollZoom.disable()
      // "load" only fires once the style and its initial tiles have actually downloaded - not
      // just once the Map object exists, which happens synchronously above regardless of
      // network. "error" fires for a failed style/tile/sprite/glyph request - e.g. the tile host
      // being unreachable even though the device itself has a network connection.
      map.on("load", () => {
        statusRef.current = "ready"
        onStatusChangeRef.current?.("ready")
      })
      map.on("error", () => {
        statusRef.current = "error"
        onStatusChangeRef.current?.("error")
      })
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

      const shelterMarker = new Marker({ element: shelterMarkerElement() })
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
)

export default ShelterLocationMap
