import { Link } from "react-router-dom"
import { useAddresses } from "../context/addressContext"
import type { Shelter } from "../types/shelter"
import { formatShelterCapacity } from "../utils/formatCapacity"
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
  /** Shows a "Närmast" badge - set by the caller for shelters[0]. */
  isNearest?: boolean
}

/**
 * Renders one shelter's distance (when known), location description, number, and - when known -
 * its type and capacity, plus a save/unsave control and a link to its detail page.
 *
 * MCF genuinely registers several separate shelters under one shared address, sometimes with
 * identical coordinates and capacity too, so the shelter's own number is shown even though the
 * location description alone might otherwise look the same as a neighboring item's. Finding a
 * shelter's exact position is the detail page's job (ShelterLocationMap.tsx's embedded map) -
 * the location description here is a free-text property reference, not a navigable address.
 */
function ShelterListItem({
  shelter,
  distanceMeters,
  saved,
  onToggleSave,
  comment,
  isNearest,
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
    <li className="group overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-blue-400 hover:shadow-md">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
        <span className="h-full w-8 bg-amber-400" />
      </div>
      <Link
        to={`/skyddsrum/${shelter.id}`}
        // The card clips overflow, so the focus outline is drawn inside the link instead.
        className="block p-5 pb-0 focus-visible:-outline-offset-4 sm:p-6 sm:pb-0"
      >
        <p
          className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-900"
          aria-hidden={isNearest ? undefined : true}
        >
          <span className={isNearest ? undefined : "invisible"} aria-hidden="true">
            ★
          </span>{" "}
          <span className={isNearest ? undefined : "invisible"}>Närmast</span>
        </p>
        <p className="font-semibold text-blue-900">
          {describeShelterLocation(shelter, activeAddress?.municipality)}
        </p>
        <p className="mt-1 text-sm text-slate-500 italic" aria-hidden={comment ? undefined : true}>
          {comment || " "}
        </p>
        <p className="mt-1 text-sm text-slate-600" aria-hidden={shelter.number ? undefined : true}>
          {shelter.number ? `Skyddsrumsnummer ${shelter.number}` : " "}
        </p>
        <p
          className="mt-1 text-sm text-slate-600"
          aria-hidden={distanceMeters !== undefined || otherDetails.length > 0 ? undefined : true}
        >
          {distanceMeters !== undefined && <ShelterDistance meters={distanceMeters} />}
          {distanceMeters !== undefined && otherDetails.length > 0 && " · "}
          {otherDetails.length > 0 ? otherDetails.join(" · ") : distanceMeters === undefined && " "}
        </p>
      </Link>
      <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${onToggleSave ? "pt-4" : "pt-3"}`}>
        {onToggleSave ? (
          <ShelterSaveToggle saved={Boolean(saved)} onToggle={onToggleSave} actions={detailsLink} />
        ) : (
          detailsLink
        )}
      </div>
    </li>
  )
}

export default ShelterListItem
