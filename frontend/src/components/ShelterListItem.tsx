import { Link } from "react-router-dom"
import { useAddresses } from "../context/addressContext"
import type { Shelter } from "../types/shelter"
import { formatShelterCapacity } from "../utils/formatCapacity"
import { buildOpenStreetMapUrl } from "../utils/mapLink"
import { describeShelterLocation } from "../utils/shelterLabel"
import { describeShelterType } from "../utils/shelterType"
import ShelterDistance from "./ShelterDistance"
import ShelterSaveToggle from "./ShelterSaveToggle"

interface ShelterListItemProps {
  shelter: Shelter
  /** Omitted when the user's position is unknown - the distance line is then skipped. */
  distanceMeters?: number
  /** Renders the ShelterSaveToggle status line and button when provided. */
  saved?: boolean
  onToggleSave?: () => void
  /** The user's own relocation note (e.g. "Kommunhuset"), set from the detail view. */
  comment?: string | null
}

/**
 * Renders one shelter's distance (when known), location description, number, and - when known -
 * its type and capacity, plus a save/unsave control and a link to its exact position on a map.
 *
 * MCF genuinely registers several separate shelters under one shared address, sometimes with
 * identical coordinates and capacity too, so the shelter's own number is shown even though the
 * location description alone might otherwise look the same as a neighboring item's. The map
 * link is the only way to actually find a shelter: the location description is a free-text
 * property reference, not a navigable address.
 */
function ShelterListItem({
  shelter,
  distanceMeters,
  saved,
  onToggleSave,
  comment,
}: ShelterListItemProps) {
  const { activeAddress } = useAddresses()
  const otherDetails = [
    shelter.type ? describeShelterType(shelter.type) : null,
    shelter.capacity !== null ? formatShelterCapacity(shelter.capacity) : null,
  ].filter((value): value is string => Boolean(value))

  const detailsLink = (
    <Link
      to={`/skyddsrum/${shelter.id}`}
      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 text-center font-semibold text-blue-900 hover:bg-blue-50"
    >
      Visa detaljer
    </Link>
  )

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
        <p className="mt-1 text-sm text-slate-500 italic" aria-hidden={comment ? undefined : true}>
          {comment || " "}
        </p>
        {shelter.number && (
          <p className="mt-1 text-sm text-slate-600">Skyddsrumsnummer {shelter.number}</p>
        )}
        {(distanceMeters !== undefined || otherDetails.length > 0) && (
          <p className="mt-1 text-sm text-slate-600">
            {distanceMeters !== undefined && <ShelterDistance meters={distanceMeters} />}
            {distanceMeters !== undefined && otherDetails.length > 0 && " · "}
            {otherDetails.join(" · ")}
          </p>
        )}

        <a
          href={buildOpenStreetMapUrl(shelter)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-12 items-center font-semibold text-blue-900 underline underline-offset-4 hover:text-blue-950"
        >
          Visa på karta
          <span className="sr-only"> (öppnas i ny flik)</span>
        </a>

        {onToggleSave ? (
          <div className="mt-4">
            <ShelterSaveToggle
              saved={Boolean(saved)}
              onToggle={onToggleSave}
              actions={detailsLink}
            />
          </div>
        ) : (
          <div className="mt-3">{detailsLink}</div>
        )}
      </div>
    </li>
  )
}

export default ShelterListItem
