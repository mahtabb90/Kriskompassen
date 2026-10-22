import { formatDistanceMeters, formatDistanceMetersForScreenReader } from "../utils/distance"

interface ShelterDistanceProps {
  meters: number
}

/**
 * Renders a shelter's straight-line distance, explicitly marked as "as the crow flies" so it is
 * never mistaken for walking distance, with a spelled-out unit for screen readers.
 */
function ShelterDistance({ meters }: ShelterDistanceProps) {
  return (
    <>
      <span aria-hidden="true">{formatDistanceMeters(meters)} (fågelvägen)</span>
      <span className="sr-only">{formatDistanceMetersForScreenReader(meters)} fågelvägen</span>
    </>
  )
}

export default ShelterDistance
