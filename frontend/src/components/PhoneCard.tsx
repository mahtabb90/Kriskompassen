import type { Phone } from "../types/krisinfo"
import { toTelHref } from "../utils/phoneLink"

const CALL_LINK_BASE =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-5 py-3 font-semibold wrap-anywhere"
const PRIMARY_CALL_CLASSES = `${CALL_LINK_BASE} bg-blue-900 text-white hover:bg-blue-950 active:bg-blue-950`
const SECONDARY_CALL_CLASSES = `${CALL_LINK_BASE} border-2 border-blue-900 bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-50`
const CARD_CLASSES = "rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
// The "Vid akut fara" panel from the calm page, reused to set the emergency number apart.
const EMERGENCY_PANEL_CLASSES = "rounded-2xl border-2 border-blue-900 bg-blue-50 p-6 sm:p-8"

interface PhoneCardProps {
  phone: Phone
}

/**
 * Shows one phone number with its guidance and click-to-call links.
 *
 * Presentational only: it renders the `phone` it is given and reads no hook, service or
 * context. `phone.isEmergency` alone selects the emergency variant, with the emergency panel,
 * a visible "Akut nödnummer" label, a primary button and an accessible name that says it is the
 * emergency number, so the distinction never relies on colour alone and cannot disagree with
 * the content.
 *
 * The heading holds both the number and the label, so heading navigation names the service.
 * Numbers are plain text outside the links, so they can be selected and copied on devices that
 * cannot place calls, and each link's accessible name starts with its visible text. The link
 * for calls from abroad is shown only when `phone.abroadNumber` is set.
 *
 * @param props.phone The phone number to show.
 */
function PhoneCard({ phone }: PhoneCardProps) {
  return (
    <div className={phone.isEmergency ? EMERGENCY_PANEL_CLASSES : CARD_CLASSES}>
      {phone.isEmergency && (
        <p className="mb-2 text-sm font-semibold text-blue-900">Akut nödnummer</p>
      )}
      <h2 className="wrap-anywhere text-blue-900">
        <span className="block text-3xl font-bold tabular-nums">{phone.number}</span>{" "}
        <span className="mt-1 block text-lg font-semibold">{phone.label}</span>
      </h2>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700">{phone.whenToUse}</p>
      <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-700">
        {phone.description}
      </p>
      <a
        href={toTelHref(phone.number)}
        aria-label={
          phone.isEmergency
            ? `Ring ${phone.number}, akut nödnummer`
            : `Ring ${phone.number}, ${phone.label}`
        }
        className={`mt-4 ${phone.isEmergency ? PRIMARY_CALL_CLASSES : SECONDARY_CALL_CLASSES}`}
      >
        Ring {phone.number}
      </a>
      {phone.abroadNumber && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Från utlandet eller utländsk telefon:{" "}
            <span className="font-semibold whitespace-nowrap text-slate-800 tabular-nums">
              {phone.abroadNumber}
            </span>
          </p>
          <a
            href={toTelHref(phone.abroadNumber)}
            aria-label={`Ring från utlandet eller med utländsk telefon till ${phone.number}, ${phone.abroadNumber}`}
            className={`mt-2 ${SECONDARY_CALL_CLASSES}`}
          >
            Ring från utlandet
          </a>
        </div>
      )}
    </div>
  )
}

export default PhoneCard
