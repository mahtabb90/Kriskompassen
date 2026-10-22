import { useRef, type RefObject } from "react"
import { Link, useLocation } from "react-router-dom"
import ShelterListItem from "../components/ShelterListItem"
import ShelterLoadFeedback from "../components/ShelterLoadFeedback"
import { useAddresses } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useNearestShelters } from "../hooks/useNearestShelters"
import type { GeoPoint } from "../utils/distance"

const panelClassName =
  "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

interface NearestSheltersProps {
  origin: GeoPoint
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** Loads and renders the nearest shelters for a known position; never mounted without one. */
function NearestShelters({ origin, headingRef }: NearestSheltersProps) {
  const { mode } = useMode()
  const { state, retry } = useNearestShelters(origin)

  if (state.status !== "ready") {
    return (
      <div className={panelClassName}>
        <ShelterLoadFeedback state={state} mode={mode} onRetry={retry} headingRef={headingRef} />
      </div>
    )
  }

  if (state.data.length === 0) {
    return (
      <p role="status" className={panelClassName}>
        Inga skyddsrum hittades i närheten.
      </p>
    )
  }

  return (
    <ol
      aria-label="Närmaste skyddsrum, sorterat efter avstånd, närmast först"
      className="mt-6 flex flex-col gap-4"
    >
      {state.data.map((shelter) => (
        <ShelterListItem key={shelter.id} shelter={shelter} />
      ))}
    </ol>
  )
}

/**
 * Lists the nearest civil-defense shelters to the user's active saved position.
 *
 * Reuses the address chosen on "Min info" (KAN-30) rather than collecting a position here; when
 * none is active yet, or the active address has no coordinates (a manually typed address is
 * never geocoded), this page prompts the user to set one there instead of duplicating that flow.
 */
function ShelterPage() {
  const { activeAddress, loading } = useAddresses()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const origin: GeoPoint | null =
    typeof activeAddress?.lat === "number" && typeof activeAddress?.lon === "number"
      ? { lat: activeAddress.lat, lon: activeAddress.lon }
      : null

  return (
    <section>
      <h1
        ref={headingRef}
        id="page-heading"
        tabIndex={-1}
        className="text-3xl font-bold text-blue-900"
      >
        Skyddsrum i närheten
      </h1>

      {notice && (
        <div role="alert" className={`${panelClassName} text-amber-900`}>
          {notice}
        </div>
      )}

      {loading && (
        <p role="status" className={panelClassName}>
          Läser din plats…
        </p>
      )}

      {!loading && !activeAddress && (
        <div className={panelClassName}>
          <p className="font-semibold text-blue-900">Ingen plats är vald än.</p>
          <p className="mt-2">
            <Link
              to="/min-info"
              className="inline-flex min-h-12 items-center underline underline-offset-4 hover:text-blue-950"
            >
              Ange din plats
            </Link>{" "}
            för att se de närmaste skyddsrummen.
          </p>
        </div>
      )}

      {!loading && activeAddress && !origin && (
        <div className={panelClassName}>
          <p className="font-semibold text-blue-900">Platsen saknar koordinater.</p>
          <p className="mt-2">
            <Link
              to="/min-info"
              className="inline-flex min-h-12 items-center underline underline-offset-4 hover:text-blue-950"
            >
              Ange din plats igen
            </Link>{" "}
            för att se de närmaste skyddsrummen.
          </p>
        </div>
      )}

      {!loading && activeAddress && origin && (
        <NearestShelters origin={origin} headingRef={headingRef} />
      )}
    </section>
  )
}

export default ShelterPage
