import { Link } from "react-router-dom"
import { useAddresses } from "../context/addressContext"
import type { NearestShelter } from "../hooks/useNearestShelters"
import { formatShelterCapacity } from "../utils/formatCapacity"
import { buildOpenStreetMapUrl } from "../utils/mapLink"
import { describeShelterLocation } from "../utils/shelterLabel"
import { describeShelterType } from "../utils/shelterType"
import ShelterDistance from "./ShelterDistance"

interface ShelterListItemProps {
  shelter: NearestShelter
}

/**
 * Renders one nearby shelter's distance, location description, number, and - when known - its
 * type and capacity, plus a link to its exact position on a map.
 *
 * MCF genuinely registers several separate shelters under one shared address, sometimes with
 * identical coordinates and capacity too, so the shelter's own number is shown even though the
 * location description alone might otherwise look the same as a neighboring item's. The map
 * link is the only way to actually find a shelter: the location description is a free-text
 * property reference, not a navigable address.
 */
function ShelterListItem({ shelter }: ShelterListItemProps) {
  const { activeAddress } = useAddresses()
  const otherDetails = [
    shelter.type ? describeShelterType(shelter.type) : null,
    shelter.capacity !== null ? formatShelterCapacity(shelter.capacity) : null,
  ].filter((value): value is string => Boolean(value))

  return (
    <li className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900" />
        <span className="h-full w-8 bg-amber-400" />
      </div>
      <div className="p-5 sm:p-6">
        <p className="font-semibold text-blue-900">
          {describeShelterLocation(shelter, activeAddress?.municipality)}
        </p>
        {shelter.number && (
          <p className="mt-1 text-sm text-slate-600">Skyddsrumsnummer {shelter.number}</p>
        )}
        <p className="mt-1 text-sm text-slate-600">
          <ShelterDistance meters={shelter.distanceMeters} />
          {otherDetails.length > 0 && ` · ${otherDetails.join(" · ")}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            to={`/skyddsrum/${shelter.id}`}
            className="inline-flex min-h-12 items-center font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-950"
          >
            Visa detaljer
          </Link>
          <a
            href={buildOpenStreetMapUrl(shelter)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-950"
          >
            Visa på karta
            <span className="sr-only"> (öppnas i ny flik)</span>
          </a>
        </div>
      </div>
    </li>
  )
}

export default ShelterListItem
