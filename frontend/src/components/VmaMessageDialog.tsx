import { useId, useLayoutEffect, useRef } from "react"
import type { VmaMessage } from "../types/vma"

interface VmaMessageDialogProps {
  message: VmaMessage
  currentMessage: VmaMessage | undefined
  loading: boolean
  failed: boolean
  uncertain: boolean
  lastCheckedAt: string | null
  onClose: () => void
}

const timeFormat = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Stockholm",
})

function validityNotice(message: VmaMessage | undefined): string | null {
  if (!message) return "Meddelandets aktuella status kan inte verifieras."
  if (message.status === "unknown") return "Meddelandets giltighet kan inte fastställas."
  if (message.status === "active") return null
  switch (message.inactiveReason) {
    case "cancelled":
      return "Meddelandet har återkallats."
    case "superseded":
      return "Meddelandet har ersatts av ett nyare meddelande."
    default:
      return "Meddelandets giltighetstid har gått ut. Det innebär inte att faran är över."
  }
}

/**
 * Keeps validated message links, falling back to the provider when no usable link is supplied.
 *
 * SR's /vma path is unavailable; exclude that known address without making cross-origin probes
 * or assuming that an arbitrary API link can be checked from this document.
 */
function informationUrls(message: VmaMessage): string[] {
  const urls = message.links
    .map((link) => new URL(link.url))
    .filter(
      (url) =>
        !(
          ["sverigesradio.se", "www.sverigesradio.se"].includes(url.hostname) &&
          url.pathname.replace(/\/+$/, "").toLowerCase() === "/vma"
        )
    )
    .map((url) => url.href)
  return urls.length ? [...new Set(urls)] : [message.source.url]
}

/**
 * Shows a selected CAP snapshot without fetching, storing or interpreting upstream markup.
 *
 * Native modal behavior makes the background inert; boundary wrapping retains keyboard focus. Initial
 * focus targets the heading so long content starts at the top. Closing releases the scroll lock
 * before the owner restores focus. Cleanup removes the listener before closing the native dialog;
 * queued close events from StrictMode cleanup are ignored when it has already reopened.
 * Missing message links and SR's unavailable /vma address use the validated provider URL.
 *
 * @param message The snapshot selected from the banner; content never switches to another CAP ID.
 * @param currentMessage The same ID in the latest evaluated feed, or undefined if no longer present.
 * @param loading Indicates an in-flight feed request, not an additional dialog request.
 * @param failed Indicates a failed feed request while previously fetched content remains readable.
 * @param uncertain Indicates incomplete feed information independently of this message's validity.
 * @param lastCheckedAt The last successful fetch time, separate from CAP publication/update time.
 * @param onClose Releases the selected snapshot and restores focus to a surviving trigger or heading.
 */
function VmaMessageDialog({
  message,
  currentMessage,
  loading,
  failed,
  uncertain,
  lastCheckedAt,
  onClose,
}: VmaMessageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const validity = validityNotice(currentMessage)
  const requestNotice = loading
    ? "Kontrollerar VMA…"
    : failed
      ? "VMA-status kunde inte kontrolleras."
      : uncertain
        ? "VMA-informationen kan vara ofullständig."
        : null
  const links = informationUrls(message)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rootStyle = document.documentElement.style
    const bodyStyle = document.body.style
    const rootOverflow = rootStyle.getPropertyValue("overflow")
    const rootPriority = rootStyle.getPropertyPriority("overflow")
    const bodyOverflow = bodyStyle.getPropertyValue("overflow")
    const bodyPriority = bodyStyle.getPropertyPriority("overflow")
    const restoreScroll = () => {
      if (rootOverflow) rootStyle.setProperty("overflow", rootOverflow, rootPriority)
      else rootStyle.removeProperty("overflow")
      if (bodyOverflow) bodyStyle.setProperty("overflow", bodyOverflow, bodyPriority)
      else bodyStyle.removeProperty("overflow")
    }
    const handleClose = () => {
      if (dialog.open) return
      restoreScroll()
      onClose()
    }
    dialog.addEventListener("close", handleClose)
    dialog.showModal()
    rootStyle.setProperty("overflow", "hidden")
    bodyStyle.setProperty("overflow", "hidden")
    headingRef.current?.focus({ preventScroll: true })

    return () => {
      dialog.removeEventListener("close", handleClose)
      if (dialog.open) dialog.close()
      restoreScroll()
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]"
        )
        const first = controls[0]
        const last = controls[controls.length - 1]
        // Native tabbing can otherwise leave the last control for browser chrome.
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      className="vma-message-dialog m-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-blue-200 bg-white p-0 text-slate-800 shadow-sm backdrop:bg-slate-950/60"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-12 min-w-12 cursor-pointer rounded-xl border border-blue-900 px-4 py-2 font-semibold text-blue-900 hover:bg-blue-50"
          >
            Stäng
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 wrap-anywhere sm:px-6">
          <p className="font-bold text-red-900">VMA · Viktigt meddelande</p>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-2xl leading-snug font-bold text-blue-900"
          >
            {message.title}
          </h2>
          <p className="mt-4">
            {message.messageType === "Update" ? "Meddelandet uppdaterat" : "Meddelandet utfärdat"}
            {": "}
            <time dateTime={message.sentAt}>{timeFormat.format(new Date(message.sentAt))}</time>
          </p>
          <a
            href={message.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 min-w-12 items-center py-2 text-blue-900 underline underline-offset-4"
          >
            Källa: {message.source.name} (öppnas i ny flik)
          </a>
          <div
            role="status"
            aria-atomic="true"
            className={
              validity || requestNotice
                ? "mt-4 rounded-xl border border-slate-300 bg-slate-100 p-4"
                : "sr-only"
            }
          >
            {validity ? <p>{validity}</p> : null}
            {requestNotice ? <p>{requestNotice}</p> : null}
            {requestNotice && lastCheckedAt ? (
              <p className="mt-2 text-sm">
                Senast kontrollerat{" "}
                <time dateTime={lastCheckedAt}>{timeFormat.format(new Date(lastCheckedAt))}</time>.
              </p>
            ) : null}
          </div>
          {message.details.map((detail, index) => (
            <section key={index} className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="text-xl leading-snug font-bold text-blue-900">{detail.event}</h3>
              <p className="mt-2 text-sm">Avsändare: {detail.senderName}</p>
              <div className="mt-4 space-y-4 leading-relaxed">
                {detail.description.split(/\r?\n\s*\r?\n/).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
              {detail.instruction ? (
                <div className="mt-5">
                  <h4 className="font-bold text-blue-900">Instruktioner</h4>
                  <p className="mt-2 leading-relaxed whitespace-pre-wrap">{detail.instruction}</p>
                </div>
              ) : null}
              <h4 className="mt-5 font-bold text-blue-900">Berört område</h4>
              {detail.area.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {[...new Set(detail.area.map((area) => area.name))].map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">Område saknas i meddelandet</p>
              )}
            </section>
          ))}
          <section className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="font-bold text-blue-900">Mer information</h3>
            <ul className="mt-2 space-y-2">
              {links.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 min-w-12 items-center py-2 text-blue-900 underline underline-offset-4"
                  >
                    Mer information hos Sveriges Radio (öppnas i ny flik)
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  )
}

export default VmaMessageDialog
