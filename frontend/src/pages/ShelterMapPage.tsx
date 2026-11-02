import { lazy, Suspense, useId, useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import type { StoredMapView } from "../components/AllSheltersMap"
import LowAccuracyNotice from "../components/LowAccuracyNotice"
import { useAddresses } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useCurrentPosition } from "../hooks/useCurrentPosition"
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
  recenterToken,
  onNavigate,
}: {
  origin: GeoPoint
  savedShelterIds: ReadonlySet<string>
  initialView?: StoredMapView
  recenterToken: number
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
      recenterToken={recenterToken}
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
  const savedOrigin: GeoPoint | null =
    typeof activeAddress?.lat === "number" && typeof activeAddress?.lon === "number"
      ? { lat: activeAddress.lat, lon: activeAddress.lon }
      : null
  const {
    position: livePosition,
    accuracy: locateAccuracy,
    loading: locatingDevice,
    failed: locateFailed,
    errorMessage: locateErrorMessage,
    recenterToken,
    requestPosition,
  } = useCurrentPosition()
  // The live-fetched position always wins over the saved address, but never writes back to it -
  // "aktiv adress" in the header/Min info/skyddsrum-listan stays untouched (see the ticket's
  // level-1 scope: session-only, local to this page).
  const origin = livePosition ?? savedOrigin
  const geolocationSupported = "geolocation" in navigator
  const locateHelpTextId = useId()

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
          <button
            type="button"
            onClick={requestPosition}
            disabled={locatingDevice || !geolocationSupported}
            aria-describedby={!geolocationSupported ? locateHelpTextId : undefined}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-60"
          >
            {locatingDevice ? "Hämtar position…" : "Hämta aktuell position"}
          </button>
          {!geolocationSupported && (
            <p id={locateHelpTextId} className="mt-1 text-sm text-slate-600">
              Den här webbläsaren stöder inte platshämtning. Ange adressen manuellt istället.
            </p>
          )}
          {locateAccuracy !== null && <LowAccuracyNotice accuracyMeters={locateAccuracy} />}
          {locateFailed && (
            <div role="alert" className="mt-1 text-sm font-medium text-red-800">
              {locateErrorMessage}
            </div>
          )}

          <div className="mt-4">
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
                  recenterToken={recenterToken}
                  onNavigate={navigate}
                />
              ) : (
                <AllSheltersMap
                  origin={null}
                  nearestShelters={[]}
                  savedShelterIds={savedShelterIds}
                  initialView={initialView}
                  recenterToken={recenterToken}
                  onNavigate={navigate}
                />
              )}
            </Suspense>
          </div>
        </div>
      )}
    </section>
  )
}

export default ShelterMapPage
