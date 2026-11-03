import type { Signal } from "../types/krisinfo"
import ExternalLink from "./ExternalLink"
import SignalIcon from "./SignalIcon"
import SignalPattern from "./SignalPattern"

const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
// Each h3 section opens with a divider, so it reads as part of the card below the h2.
const SECTION_CLASSES = "mt-6 border-t border-slate-200 pt-5"
const SUBHEADING_CLASSES = "text-lg font-semibold text-blue-900"
const BODY_CLASSES = "max-w-prose text-base leading-relaxed text-slate-700"

interface SignalCardProps {
  signal: Signal
  isOnline: boolean
}

/**
 * Shows one outdoor warning signal: its name, drawn pattern, meaning and what to do.
 *
 * Presentational only: it renders the `signal` it is given and reads no hook, service or
 * context. The name is an `h2`; "Betydelse" and "Gör så här" are `h3` sections below it, each
 * opened by a divider.
 *
 * - A tinted panel groups how the signal sounds: the loudspeaker icon beside
 *   `patternDescription`, and the drawn timeline below them at the panel's full width. The icon
 *   and timeline are decorative; `patternDescription` is always shown as text.
 * - The panel ends with an external link to the signal's recording at `audioLinkUrl`, which the
 *   content takes from MCF, so the label names both the signal and MCF. Without `audioLinkUrl`
 *   no link is shown. The app itself never plays, stores or caches the recording.
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
      <h2 className="wrap-anywhere text-2xl font-bold text-blue-900">{signal.name}</h2>
      <div className="mt-4 rounded-xl bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-900"
          >
            <SignalIcon />
          </span>
          <p className={`min-w-0 self-center ${BODY_CLASSES}`}>{signal.patternDescription}</p>
        </div>
        <SignalPattern pattern={signal.pattern} className="mt-4" />
        {signal.audioLinkUrl && (
          <p className="mt-2">
            <ExternalLink
              href={signal.audioLinkUrl}
              label={`Lyssna på signalen ${signal.name} hos MCF`}
              isOnline={isOnline}
            />
          </p>
        )}
      </div>

      {signal.meaning !== undefined && (
        <div className={SECTION_CLASSES}>
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
        </div>
      )}

      {signal.whatToDo.length > 0 && (
        <div className={SECTION_CLASSES}>
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
        </div>
      )}
    </div>
  )
}

export default SignalCard
