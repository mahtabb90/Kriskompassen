import { useId, useState } from "react"
import { LOW_ACCURACY_THRESHOLD_METERS } from "../types/address"

interface LowAccuracyNoticeProps {
  /** The browser's own radius of uncertainty for a device-position fix, in meters. */
  accuracyMeters: number
}

/**
 * A collapsed-by-default disclosure flagging an unusually imprecise device-position fix -
 * shared by every caller that surfaces a geolocated position to the user (address entry on "Min
 * info", the shelter map's "Hämta aktuell position" button), so the threshold, explanation and
 * improvement tips never drift between them. Renders nothing at or below
 * LOW_ACCURACY_THRESHOLD_METERS - most fixes don't need this flagged at all.
 *
 * The expanded panel is absolutely positioned so opening it never shifts surrounding layout
 * (e.g. pushes a map down, or the address form's own buttons) - floats into free space beside
 * the toggle on wider screens, below it on narrow ones where there's no room to the side.
 */
function LowAccuracyNotice({ accuracyMeters }: LowAccuracyNoticeProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  if (accuracyMeters <= LOW_ACCURACY_THRESHOLD_METERS) return null

  return (
    // self-start guards against a flex-column parent's default align-items: stretch (e.g.
    // AddressSection's address-preview card) silently expanding this wrapper to the container's
    // full width, which would anchor the sm:left-full panel far past the toggle button itself -
    // a no-op in any non-flex parent (e.g. ShelterMapPage's plain block container).
    <div className="relative mt-1 inline-block self-start">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-12 min-w-12 items-center gap-1.5 rounded-xl px-2 py-1 text-sm font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-5 shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 16v-4.5M12 8.5h.01" />
        </svg>
        Ungefärlig position
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 top-full z-10 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-blue-200/80 bg-white p-4 text-sm text-slate-600 shadow-sm sm:left-full sm:top-0 sm:mt-0 sm:ml-2"
      >
        <p>
          Positionen är ungefärlig (ca ±{(accuracyMeters / 1000).toFixed(1)} km). Det kan bero på:
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>En mobil ger ofta bättre precision än en dator, som sällan har GPS.</li>
          <li>
            Är wifi avstängt kan precisionen bli sämre - GPS och wifi-position kompletterar
            varandra.
          </li>
          <li>Inomhus eller i tät bebyggelse kan signalen bli svagare.</li>
        </ul>
      </div>
    </div>
  )
}

export default LowAccuracyNotice
