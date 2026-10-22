import { useId, useRef, useState, type RefObject } from "react"
import { Link, useLocation } from "react-router-dom"
import SavedSheltersSection from "../components/SavedSheltersSection"
import ShelterGeneralInfo from "../components/ShelterGeneralInfo"
import ShelterListItem from "../components/ShelterListItem"
import ShelterLoadFeedback from "../components/ShelterLoadFeedback"
import { useAddresses } from "../context/addressContext"
import { useMode } from "../context/modeContext"
import { useNearestShelters } from "../hooks/useNearestShelters"
import { useSavedShelters } from "../hooks/useSavedShelters"
import type { SavedShelter, Shelter } from "../types/shelter"
import type { GeoPoint } from "../utils/distance"

const panelClassName =
  "mt-6 rounded-2xl border border-blue-200/80 bg-white p-6 text-slate-600 shadow-sm sm:p-8"

interface NearestSheltersProps {
  origin: GeoPoint
  headingRef: RefObject<HTMLHeadingElement | null>
  savedShelters: SavedShelter[]
  isSaved: (id: string) => boolean
  onSave: (shelter: Pick<Shelter, "id" | "address" | "lat" | "lon">) => void
  onRemove: (id: string) => void
}

/** Loads and renders the nearest shelters for a known position; never mounted without one. */
function NearestShelters({
  origin,
  headingRef,
  savedShelters,
  isSaved,
  onSave,
  onRemove,
}: NearestSheltersProps) {
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
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <ol
        aria-label="Närmaste skyddsrum, sorterat efter avstånd, närmast först"
        className="contents"
      >
        {state.data.map((shelter) => (
          <ShelterListItem
            key={shelter.id}
            shelter={shelter}
            distanceMeters={shelter.distanceMeters}
            saved={isSaved(shelter.id)}
            onToggleSave={() => (isSaved(shelter.id) ? onRemove(shelter.id) : onSave(shelter))}
            comment={savedShelters.find((saved) => saved.id === shelter.id)?.comment ?? null}
          />
        ))}
      </ol>

      {/* Fills the otherwise-empty second column when the count is odd - a sibling of the
          list rather than an <li> inside it, so the list's aria-label (which promises only
          shelters, sorted by distance) stays accurate for screen reader users. */}
      {state.data.length % 2 === 1 && (
        <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white p-5 shadow-sm sm:p-6">
          <ShelterGeneralInfo />
        </div>
      )}
    </div>
  )
}

const tabButtonClassName = (active: boolean) =>
  "-mb-px min-h-12 border-b-2 px-1 py-3 text-base font-semibold wrap-anywhere " +
  (active
    ? "border-blue-900 text-blue-900"
    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-blue-900")

/**
 * Lists the nearest civil-defense shelters to the user's active saved position, and - on a
 * separate tab - the shelters bookmarked on this device ("Sparade skyddsrum").
 *
 * The two are deliberately different sets: a bookmarked shelter is not necessarily nearby right
 * now, and the nearest list changes as the user's saved position changes. Reuses the address
 * chosen on "Min info" (KAN-30) rather than collecting a position here; when none is active yet,
 * or the active address has no coordinates (a manually typed address is never geocoded), the
 * nearest-shelters tab prompts the user to set one there instead of duplicating that flow. The
 * saved-shelters tab is unaffected by the online/offline mode toggle - bookmarks are always
 * local, regardless of mode.
 */
function ShelterPage() {
  const { activeAddress, loading } = useAddresses()
  const { mode } = useMode()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const origin: GeoPoint | null =
    typeof activeAddress?.lat === "number" && typeof activeAddress?.lon === "number"
      ? { lat: activeAddress.lat, lon: activeAddress.lon }
      : null
  const {
    shelters: savedShelters,
    loading: savedLoading,
    isSaved,
    save: saveShelter,
    remove: removeSavedShelter,
  } = useSavedShelters()
  const [activeTab, setActiveTab] = useState<"nearest" | "saved">(
    mode === "offline" ? "saved" : "nearest"
  )
  // Adjusts the tab mid-render when the header's online/offline toggle changes, per React's
  // "storing information from previous renders" pattern - offline has no live nearest-shelters
  // data to show, so the saved-shelters tab (always available locally) becomes the relevant
  // one. Still just a default; the user can switch tabs freely afterward within either mode.
  const [prevMode, setPrevMode] = useState(mode)
  if (mode !== prevMode) {
    setPrevMode(mode)
    setActiveTab(mode === "offline" ? "saved" : "nearest")
  }

  const idPrefix = useId()
  const nearestTabId = `${idPrefix}-tab-nearest`
  const savedTabId = `${idPrefix}-tab-saved`

  return (
    <section>
      <h1
        ref={headingRef}
        id="page-heading"
        tabIndex={-1}
        className="text-3xl font-bold text-blue-900"
      >
        Skyddsrum
      </h1>

      {notice && (
        <div role="alert" className={`${panelClassName} text-amber-900`}>
          {notice}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Skyddsrumsvyer"
        className="mt-6 flex gap-6 border-b border-slate-200"
      >
        <button
          type="button"
          role="tab"
          id={nearestTabId}
          aria-selected={activeTab === "nearest"}
          aria-controls={`${nearestTabId}-panel`}
          tabIndex={activeTab === "nearest" ? 0 : -1}
          onClick={() => setActiveTab("nearest")}
          className={tabButtonClassName(activeTab === "nearest")}
        >
          Skyddsrum i närheten
        </button>
        <button
          type="button"
          role="tab"
          id={savedTabId}
          aria-selected={activeTab === "saved"}
          aria-controls={`${savedTabId}-panel`}
          tabIndex={activeTab === "saved" ? 0 : -1}
          onClick={() => setActiveTab("saved")}
          className={tabButtonClassName(activeTab === "saved")}
        >
          Sparade skyddsrum
        </button>
      </div>

      {activeTab === "nearest" && (
        <div role="tabpanel" id={`${nearestTabId}-panel`} aria-labelledby={nearestTabId}>
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
            <NearestShelters
              origin={origin}
              headingRef={headingRef}
              savedShelters={savedShelters}
              isSaved={isSaved}
              onSave={saveShelter}
              onRemove={removeSavedShelter}
            />
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <div role="tabpanel" id={`${savedTabId}-panel`} aria-labelledby={savedTabId}>
          <SavedSheltersSection
            origin={origin}
            savedShelters={savedShelters}
            loading={savedLoading}
            onRemove={removeSavedShelter}
          />
        </div>
      )}
    </section>
  )
}

export default ShelterPage
