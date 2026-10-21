import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useAddresses } from "../context/addressContext"
import { useCrisisResource } from "../hooks/useCrisisResource"
import { getCachedShelterById } from "../services/shelterStorageService"
import { formatDistanceMeters, haversineDistanceMeters, type GeoPoint } from "../utils/distance"
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
  const distanceLabel =
    shelter && origin ? formatDistanceMeters(haversineDistanceMeters(origin, shelter)) : null
  const typeLabel = shelter?.type ? describeShelterType(shelter.type) : null
  const locationLabel = shelter
    ? describeShelterLocation(shelter, activeAddress?.municipality)
    : undefined

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
              {distanceLabel && <Field label="Avstånd från din plats">{distanceLabel}</Field>}
            </dl>

            <a
              href={buildOpenStreetMapUrl(shelter)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-950"
            >
              Visa skyddsrummet på kartan
              <span className="sr-only"> (öppnas i ny flik)</span>
            </a>

            <section className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-xl font-bold text-blue-900">Om skyddsrum</h2>
              <p className="mt-3 max-w-prose text-slate-700">
                Skyddsrum är utrymmen som ska skydda mot tryckvåg och splitter vid höjd beredskap
                eller krig. De är märkta med en skylt vid entrén: en orange ruta med en blå
                triangel.
              </p>
              <p className="mt-3 max-w-prose text-slate-700">
                Om skyddsrummen behöver tas i bruk har fastighetsägaren upp till två dygn på sig att
                ställa i ordning dem med vatten, värme, ventilation och toaletter. Ta själv med dig
                mat, vatten, mediciner, hygienartiklar, varma kläder, ficklampa och mobiltelefon med
                laddare.
              </p>
              <a
                href="https://www.krisinformation.se/forbered-dig/skyddsrum-utrymning-och-varningssystem/skyddsrum/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4"
              >
                Läs mer om skyddsrum hos Krisinformation.se
                <span className="sr-only"> (öppnas i ny flik)</span>
              </a>
            </section>
          </>
        )}
      </div>
    </article>
  )
}

export default ShelterDetailPage
