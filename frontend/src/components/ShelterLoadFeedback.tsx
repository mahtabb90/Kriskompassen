import { useLayoutEffect, useRef, type RefObject } from "react"
import type { Mode } from "../context/modeContext"
import type { CrisisResourceState } from "../hooks/useCrisisResource"
import type { NearestShelter } from "../hooks/useNearestShelters"
import { ShelterResponseValidationError } from "../services/shelterResponseValidator"
import { ShelterRequestError } from "../services/shelterService"

interface ShelterLoadFeedbackProps {
  state: Exclude<CrisisResourceState<NearestShelter[]>, { status: "ready" }>
  mode: Mode
  onRetry: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
}

function errorMessage(error: unknown, mode: Mode): string {
  if (mode === "offline") {
    return "Det gick inte att läsa sparade skyddsrum från din enhet. Försök igen."
  }
  if (error instanceof ShelterRequestError && error.code === "timeout") {
    return "Det tog för lång tid att hämta skyddsrum i närheten. Försök igen."
  }
  if (error instanceof ShelterResponseValidationError) {
    return "Skyddsrumsinformationen kunde inte visas. Försök igen."
  }
  return "Det gick inte att hämta skyddsrum i närheten. Försök igen."
}

/**
 * Announces shelter loading/failure in Swedish and offers an explicit retry.
 *
 * Mirrors CrisisLoadFeedback's contract exactly: the retry control stays mounted during a
 * retry, guarded by aria-disabled, and focus returns to the stable page heading only if it was
 * still within this feedback when it unmounts.
 */
function ShelterLoadFeedback({ state, mode, onRetry, headingRef }: ShelterLoadFeedbackProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    const heading = headingRef.current
    return () => {
      if (root?.contains(document.activeElement)) heading?.focus({ preventScroll: true })
    }
  }, [headingRef])

  const loading = state.status === "loading"
  return (
    <div ref={rootRef}>
      <p role={loading ? "status" : "alert"} className={loading ? "" : "text-red-800"}>
        {state.status === "error"
          ? errorMessage(state.error, mode)
          : mode === "online"
            ? "Hämtar skyddsrum i närheten…"
            : "Läser sparade skyddsrum…"}
      </p>
      {(state.status === "error" || state.retrying) && (
        <button
          type="button"
          aria-disabled={loading}
          onClick={() => {
            if (!loading) onRetry()
          }}
          className="mt-4 inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50 aria-disabled:cursor-default aria-disabled:opacity-60"
        >
          Försök igen
        </button>
      )}
    </div>
  )
}

export default ShelterLoadFeedback
