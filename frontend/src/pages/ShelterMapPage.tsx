import { lazy, Suspense, useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import type { StoredMapView } from "../components/AllSheltersMap"
import { useAddresses } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useNearestShelters } from "../hooks/useNearestShelters"
import { useSavedShelters } from "../hooks/useSavedShelters"
import type { GeoPoint } from "../utils/distance"

// Lazy-loaded so maplibre-gl is only fetched once a user actually opens this page, never on
// first app load - this is the only shelter map left in the app, so it's also the only place
// this lazy-loading pattern applies now. A type-only import of AllSheltersMap above does not
// trigger this - type imports are erased entirely at compile time.
const AllSheltersMap = lazy(() => import("../components/AllSheltersMap"))

const panelClassName =
  "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

/** Mounted only once an origin is known, so useNearestShelters (which requires one) is always
 * called with a real position - mirrors ShelterPage.tsx's own NearestShelters/origin split. */
function AllSheltersMapWithNearest({
  origin,
  savedShelterIds,
  initialView,
  onNavigate,
}: {
  origin: GeoPoint
  savedShelterIds: ReadonlySet<string>
  initialView?: StoredMapView
  onNavigate: (path: string, options?: { state?: unknown }) => void
}) {
  const { state } = useNearestShelters(origin)
  const nearestShelters = state.status === "ready" ? state.data : []

  return (
    <AllSheltersMap
      origin={origin}
      nearestShelters={nearestShelters}
      savedShelterIds={savedShelterIds}
      initialView={initialView}
      onNavigate={onNavigate}
    />
  )
}

/**
 * Lets the user explore every civil-defense shelter in Sweden on a clustered map ("Kartan"),
 * including the nearest/saved-highlighting that used to live in its own separate map on
 * "Skyddsrum i närheten" - that map (ShelterMap.tsx) has been retired; this is now the single
 * shelter map in the app, reached via the "Kartan" link next to the Skyddsrum tabs.
 *
 * Online-only, same per-page gating pattern as ShelterPage.tsx (there is no shared route-level
 * online/offline guard in this app) - map tiles and the viewport-fetch endpoint both need a
 * network request, so this page shows a message instead of mounting the map while offline.
 *
 * Reading `location.state.mapView` lets a visit to a shelter's detail page hand the exact
 * camera position back on return, instead of always resetting to the default view - see
 * AllSheltersMap.tsx's StoredMapView and ShelterDetailPage.tsx's "Tillbaka till kartan" link.
 */
function ShelterMapPage() {
  const { mode } = useMode()
  const { activeAddress } = useAddresses()
  const { shelters: savedShelters } = useSavedShelters()
  const navigate = useNavigate()
  const location = useLocation()
  // Set by AllSheltersMap.tsx when navigating to a shelter's detail page, and handed straight
  // back here by ShelterDetailPage.tsx's "Tillbaka till kartan" link - resumes the exact spot
  // the user was exploring instead of resetting to the usual origin-based view.
  const routeState = location.state as { mapView?: StoredMapView; notice?: string } | null
  const initialView = routeState?.mapView
  const notice = routeState?.notice
  const savedShelterIds = useMemo(
    () => new Set(savedShelters.map((shelter) => shelter.id)),
    [savedShelters]
  )
  const origin: GeoPoint | null =
    typeof activeAddress?.lat === "number" && typeof activeAddress?.lon === "number"
      ? { lat: activeAddress.lat, lon: activeAddress.lon }
      : null

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Kartan
      </h1>

      {notice && (
        <div role="alert" className={`${panelClassName} text-amber-900`}>
          {notice}
        </div>
      )}

      <p className="mt-2 text-slate-600">
        Utforska alla Sveriges skyddsrum. Dina 5 närmaste och dina sparade skyddsrum är särskilt
        markerade.
      </p>
      <p className="mt-2">
        <Link
          to="/skyddsrum"
          className="inline-flex min-h-12 items-center underline underline-offset-4 hover:text-blue-950"
        >
          Tillbaka till Skyddsrum i närheten
        </Link>
      </p>

      {mode === "offline" ? (
        <p role="status" className={panelClassName}>
          Kartan kräver internetanslutning.
        </p>
      ) : (
        <div className="mt-6">
          <Suspense
            fallback={
              <p role="status" className={panelClassName}>
                Laddar karta…
              </p>
            }
          >
            {origin ? (
              <AllSheltersMapWithNearest
                origin={origin}
                savedShelterIds={savedShelterIds}
                initialView={initialView}
                onNavigate={navigate}
              />
            ) : (
              <AllSheltersMap
                origin={null}
                nearestShelters={[]}
                savedShelterIds={savedShelterIds}
                initialView={initialView}
                onNavigate={navigate}
              />
            )}
          </Suspense>
        </div>
      )}
    </section>
  )
}

export default ShelterMapPage
