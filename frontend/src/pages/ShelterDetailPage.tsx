import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import ShelterDistance from "../components/ShelterDistance"
import ShelterGeneralInfo from "../components/ShelterGeneralInfo"
import ShelterSaveToggle from "../components/ShelterSaveToggle"
import { useAddresses } from "../context/addressContext"
import { useCrisisResource } from "../hooks/useCrisisResource"
import { useSavedShelters } from "../hooks/useSavedShelters"
import { getCachedShelterById } from "../services/shelterStorageService"
import { haversineDistanceMeters, type GeoPoint } from "../utils/distance"
import { formatShelterCapacity } from "../utils/formatCapacity"
import { buildOpenStreetMapUrl } from "../utils/mapLink"
import { describeShelterLocation } from "../utils/shelterLabel"
import { describeShelterType } from "../utils/shelterType"

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd className="mt-1 font-semibold text-blue-900">{children}</dd>
    </div>
  )
}

/**
 * Shows one shelter's details - location, id, type, capacity and distance from the user - plus a
 * link to it on a map and general shelter guidance that works fully offline.
 *
 * Shelters have no single-shelter backend endpoint, so the lookup always reads the local cache
 * that the nearest-shelters list already wrote through - the same data online and offline alike.
 * Redirects to the shelter list if the id was never cached, matching DetailedCrisisCard's
 * not-found pattern. Fields missing from the source data are omitted rather than shown empty.
 */
function ShelterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeAddress } = useAddresses()
  const { shelters: savedShelters, isSaved, save, remove, updateComment } = useSavedShelters()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const load = useCallback(() => (id ? getCachedShelterById(id) : Promise.resolve(undefined)), [id])
  const { state, retry } = useCrisisResource(id ?? "", load)
  const status = state.status
  const shelter = state.status === "ready" ? state.data : undefined

  useEffect(() => {
    if (status !== "ready" || shelter) return
    navigate("/skyddsrum", {
      replace: true,
      state: {
        notice: "Det skyddsrummet är inte sparat lokalt. Sök i närheten igen för att hämta det.",
      },
    })
  }, [status, shelter, navigate])

  const origin: GeoPoint | null =
    typeof activeAddress?.lat === "number" && typeof activeAddress?.lon === "number"
      ? { lat: activeAddress.lat, lon: activeAddress.lon }
      : null
  const distanceMeters = shelter && origin ? haversineDistanceMeters(origin, shelter) : null
  const typeLabel = shelter?.type ? describeShelterType(shelter.type) : null
  const locationLabel = shelter
    ? describeShelterLocation(shelter, activeAddress?.municipality)
    : undefined
  const shelterSaved = shelter ? isSaved(shelter.id) : false
  const savedRecord = shelter ? savedShelters.find((saved) => saved.id === shelter.id) : undefined
  const [commentConfirmation, setCommentConfirmation] = useState("")
  // Clears a stale confirmation when navigating to a different shelter, per React's "storing
  // information from previous renders" pattern (see ShelterPage's mode-driven tab for the same
  // approach) - avoids a lingering "Kommentar sparad." from the previous shelter's page.
  const [confirmationForId, setConfirmationForId] = useState(id)
  if (id !== confirmationForId) {
    setConfirmationForId(id)
    setCommentConfirmation("")
  }
  const handleToggleSave = useCallback(() => {
    if (!shelter) return
    if (isSaved(shelter.id)) {
      void remove(shelter.id)
    } else {
      void save(shelter)
    }
  }, [shelter, isSaved, save, remove])

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900" />
        <span className="h-full w-8 bg-amber-400" />
      </div>

      <div className="p-6 sm:p-8">
        <Link
          to="/skyddsrum"
          className="mb-6 inline-flex min-h-12 items-center gap-1 font-medium text-blue-900 underline underline-offset-4"
        >
          <span aria-hidden="true">←</span>Tillbaka till skyddsrum i närheten
        </Link>

        <h1
          ref={headingRef}
          id="page-heading"
          tabIndex={-1}
          className="wrap-anywhere text-3xl font-bold text-blue-900"
        >
          {locationLabel ?? "Skyddsrum"}
        </h1>

        {status === "loading" && (
          <p role="status" className="mt-6 text-slate-600">
            Läser skyddsrumsinformation…
          </p>
        )}

        {status === "error" && (
          <div className="mt-6">
            <p role="alert" className="text-red-800">
              Det gick inte att läsa skyddsrummet från din enhet.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
            >
              Försök igen
            </button>
          </div>
        )}

        {shelter && (
          <>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Plats">{locationLabel}</Field>
              {shelter.number && <Field label="Skyddsrumsnummer">{shelter.number}</Field>}
              {typeLabel && <Field label="Typ">{typeLabel}</Field>}
              {shelter.capacity !== null && (
                <Field label="Kapacitet">{formatShelterCapacity(shelter.capacity)}</Field>
              )}
              {distanceMeters !== null && (
                <Field label="Avstånd från din plats">
                  <ShelterDistance meters={distanceMeters} />
                </Field>
              )}
            </dl>

            <div className="mt-6">
              <ShelterSaveToggle saved={shelterSaved} onToggle={handleToggleSave} />
            </div>

            {shelterSaved && (
              <div className="mt-4">
                <label
                  htmlFor="shelter-comment"
                  className="block text-sm font-medium text-slate-600"
                >
                  Kommentar som hjälper dig hitta hit (visas i listan, max 50 tecken)
                </label>
                <input
                  key={savedRecord?.id ?? "unsaved"}
                  id="shelter-comment"
                  type="text"
                  maxLength={50}
                  defaultValue={savedRecord?.comment ?? ""}
                  onChange={() => setCommentConfirmation("")}
                  onBlur={(event) => {
                    if (!shelter) return
                    const value = event.target.value
                    void updateComment(shelter.id, value).then(() =>
                      setCommentConfirmation("Kommentar sparad.")
                    )
                  }}
                  placeholder="T.ex. Kommunhuset"
                  className="mt-1 w-full max-w-sm rounded-xl border-2 border-blue-900 px-4 py-3 font-medium text-blue-900 placeholder:font-normal placeholder:text-slate-400"
                />
                <div role="status" className="mt-2 text-sm font-medium text-green-800">
                  {commentConfirmation}
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-6">
              <a
                href={buildOpenStreetMapUrl(shelter)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-950"
              >
                Visa skyddsrummet på kartan
                <span className="sr-only"> (öppnas i ny flik)</span>
              </a>
            </div>

            <section className="mt-8 border-t border-slate-200 pt-6">
              <ShelterGeneralInfo />
            </section>
          </>
        )}
      </div>
    </article>
  )
}

export default ShelterDetailPage
