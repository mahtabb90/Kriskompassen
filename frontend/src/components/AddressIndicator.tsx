import { Link } from "react-router-dom"
import { useAddresses } from "../context/addressContext"
import { truncateForDisplay } from "../utils/truncate"

/** Keeps a single long "word" (e.g. no spaces to wrap at) from overflowing its own line. */
const ADDRESS_DISPLAY_MAX_LENGTH = 30

/**
 * Shows the active saved address as a discreet link to the full address list.
 *
 * Renders nothing until an address is active, so it never competes for attention before the
 * user has saved one — managing addresses (adding, labelling, choosing the active one) happens
 * on the "Min info" page this links to, not here. "Aktuell adress:" is plain text, not part of
 * the link, so only the address itself reads as clickable; the two are allowed to wrap onto
 * separate lines if the available width is too narrow, rather than overflowing or clipping.
 * Shows only the municipality, not the full street address, to keep this short; a geolocated
 * address always has one, a manually typed address does not, since it is never geocoded, so
 * the full text is shown as a fallback, truncated to a fixed display length.
 */
function AddressIndicator() {
  const { activeAddress } = useAddresses()

  if (!activeAddress) return null

  const addressText = activeAddress.municipality ?? activeAddress.text

  return (
    <p className="max-w-full text-sm font-medium text-blue-900">
      Aktuell adress:{" "}
      <Link
        to="/min-info"
        className="inline-flex min-h-12 items-center underline underline-offset-4 hover:text-blue-950"
      >
        {truncateForDisplay(addressText, ADDRESS_DISPLAY_MAX_LENGTH)}
      </Link>
    </p>
  )
}

export default AddressIndicator
