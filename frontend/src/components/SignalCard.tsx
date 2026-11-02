import type { Signal } from "../types/krisinfo"
import ExternalLink from "./ExternalLink"
import SignalPattern from "./SignalPattern"

const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
const SUBHEADING_CLASSES = "mt-6 text-lg font-semibold text-blue-900"
const BODY_CLASSES = "max-w-prose text-base leading-relaxed text-slate-700"

interface SignalCardProps {
  signal: Signal
  isOnline: boolean
}

/**
 * Shows one outdoor warning signal: its name, drawn pattern, meaning and what to do.
 *
 * Presentational only: it renders the `signal` it is given and reads no hook, service or
 * context. The name is an `h2`; "Betydelse" and "Gör så här" are `h3` below it.
 *
 * - The drawn pattern is decorative; `patternDescription` is always shown as text.
 * - The meaning is shown only when the content has one, with its own source link when
 *   `meaningSource` is set. Nothing replaces a missing meaning.
 * - The actions are an ordered list. Each step's text is always shown; its link, if any, is a
 *   complement below it. The section is left out when the content lists no actions, so no
 *   advice is invented.
 *
 * @param props.signal The signal to show.
 * @param props.isOnline Browser-reported connectivity, passed to the external links so they
 * can say that they need internet.
 */
function SignalCard({ signal, isOnline }: SignalCardProps) {
  return (
    <div className={CARD_CLASSES}>
      <h2 className="wrap-anywhere text-xl font-bold text-blue-900">{signal.name}</h2>
      <SignalPattern pattern={signal.pattern} className="mt-4" />
      <p className={`mt-3 ${BODY_CLASSES}`}>{signal.patternDescription}</p>

      {signal.meaning !== undefined && (
        <>
          <h3 className={SUBHEADING_CLASSES}>Betydelse</h3>
          <p className={`mt-2 ${BODY_CLASSES}`}>{signal.meaning}</p>
          {signal.meaningSource && (
            <p className="mt-1 text-sm text-slate-600">
              Källa:{" "}
              <ExternalLink
                href={signal.meaningSource.url}
                label={signal.meaningSource.name}
                isOnline={isOnline}
              />
            </p>
          )}
        </>
      )}

      {signal.whatToDo.length > 0 && (
        <>
          <h3 className={SUBHEADING_CLASSES}>Gör så här</h3>
          <ol className="mt-2 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-blue-900">
            {signal.whatToDo.map((step, index) => (
              // The steps are static content in a fixed order, so the position is a stable key.
              <li key={index} className="pl-1">
                <p className={BODY_CLASSES}>{step.text}</p>
                {step.link && (
                  <ExternalLink href={step.link.url} label={step.link.label} isOnline={isOnline} />
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

export default SignalCard
