import { useId, useLayoutEffect, useRef, useState } from "react"
import { vmaStatusLines, type VmaStatus } from "../services/vmaStatusText"
import type { VmaMessage } from "../types/vma"

interface VmaBannerProps extends VmaStatus {
  message: VmaMessage | null
  activeMessages: VmaMessage[]
  retrying: boolean
  retry: () => void
  openMessage: (message: VmaMessage, trigger: HTMLButtonElement) => void
}

const sentTimeFormat = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Stockholm",
})

function countText(count: number): string {
  return count === 1 ? "1 aktivt VMA" : `${count} aktiva VMA`
}

/** Distinguishes messages whose CAP event titles are often identical generic VMA labels. */
function messageMeta(message: VmaMessage, id: string) {
  const areas = [...new Set(message.areas.map((area) => area.name))]
  return (
    <p id={id} className="text-sm">
      {areas.length ? areas.join(", ") : "Område saknas i meddelandet"}
      {" · "}
      {message.messageType === "Update" ? "Uppdaterat" : "Utfärdat"}{" "}
      <time dateTime={message.sentAt}>{sentTimeFormat.format(new Date(message.sentAt))}</time>
    </p>
  )
}

/**
 * Presents the active warnings or a neutral VMA request status without performing I/O.
 *
 * The first message is shown in full; when several are active, a visible count and a collapsed
 * disclosure list give access to the others in the supplied order. Renders upstream text as plain
 * text and keeps stable live regions across route changes: the alert announces a new first
 * message, while a polite region announces count changes. If a focused list entry disappears,
 * focus moves to the disclosure control or the first message instead of being lost. The
 * scrollable region preserves complete long titles within a bounded part of the viewport.
 * The status region changes only with the derived request state, so background polls stay
 * silent; a separate polite region announces when outdated or unavailable information has been
 * successfully updated, without implying that no VMA exists.
 *
 * @param message The first active warning, or null when none can be displayed.
 * @param activeMessages All displayable active warnings in display order, each CAP ID once.
 * @param loading Indicates a pending request while no successful result exists.
 * @param unavailable Indicates that no successful result exists and none is pending.
 * @param stale Indicates retained information that may be outdated.
 * @param offline Hides the retry control and adds the connection state to the status.
 * @param uncertain Indicates incomplete or unknown validity information.
 * @param lastCheckedAt The backend's last successful SR check, not a local expiry check.
 * @param retrying Keeps the retry control present and disabled during a manual request.
 * @param retry Starts a guarded manual request.
 * @param openMessage Opens the chosen CAP message and records its trigger for focus restoration.
 */
function VmaBanner({
  message,
  activeMessages,
  retrying,
  retry,
  openMessage,
  ...status
}: VmaBannerProps) {
  const { loading, unavailable, stale, offline, uncertain } = status
  const baseId = useId()
  const listId = `${baseId}-list`
  const titleRef = useRef<HTMLButtonElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const focusedListEntry = useRef<string | null>(null)
  const others = message ? activeMessages.filter((active) => active.id !== message.id) : []
  const count = message ? others.length + 1 : 0
  const [expanded, setExpanded] = useState(false)
  const [previousCount, setPreviousCount] = useState(count)
  const [countAnnouncement, setCountAnnouncement] = useState("")
  const impaired = unavailable || stale
  const [wasImpaired, setWasImpaired] = useState(impaired)
  const [recoveryAnnouncement, setRecoveryAnnouncement] = useState("")

  if (count !== previousCount) {
    setPreviousCount(count)
    // Announce a drop back to one message, but not a single first warning already in the alert.
    setCountAnnouncement(
      count > 1 || (count === 1 && previousCount > 1) ? `${countText(count)}.` : ""
    )
    if (count < 2) setExpanded(false)
  }

  // A pending request is not yet a recovery; compare settled states only.
  if (!loading && impaired !== wasImpaired) {
    setWasImpaired(impaired)
    setRecoveryAnnouncement(impaired ? "" : "VMA-informationen är uppdaterad.")
  }

  useLayoutEffect(() => {
    const id = focusedListEntry.current
    if (id === null || others.some((other) => other.id === id)) return
    focusedListEntry.current = null
    // Removing a focused element sends focus to the body without a blur event.
    if (document.activeElement && document.activeElement !== document.body) return
    const target = id === message?.id ? titleRef.current : (toggleRef.current ?? titleRef.current)
    target?.focus()
  })

  const visible = Boolean(message || loading || unavailable || stale || uncertain)
  const statusLines = vmaStatusLines(status)

  return (
    <>
      <div role="alert" aria-atomic="true" className="sr-only">
        {message ? <span key={message.id}>VMA: {message.title}</span> : null}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {countAnnouncement}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {recoveryAnnouncement}
      </div>
      {visible ? (
        <aside
          aria-label={message ? "Viktigt meddelande till allmänheten" : "VMA-status"}
          tabIndex={0}
          className={
            "vma-notice max-h-[40dvh] overflow-y-auto overscroll-contain border-b pt-[env(safe-area-inset-top)] " +
            (message
              ? "vma-banner border-vma-border bg-vma-surface text-vma-foreground"
              : "border-slate-300 bg-slate-100 text-slate-900")
          }
        >
          <div className="mx-auto w-full max-w-4xl px-4 py-3 wrap-anywhere sm:px-6">
            {message ? (
              <>
                <p className="sticky top-0 flex items-center gap-2 bg-vma-surface text-sm font-bold tracking-wide">
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    className="size-6 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3 2 21h20L12 3Z" />
                    <path d="M12 9v5m0 3h.01" />
                  </svg>
                  <span>VMA · Viktigt meddelande</span>
                </p>
                {others.length ? <p className="mt-1 font-semibold">{countText(count)}</p> : null}
                <h2 className="mt-1 text-lg leading-snug font-bold sm:text-xl">
                  <button
                    ref={titleRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-describedby={others.length ? `${baseId}-meta` : undefined}
                    data-vma-id={message.id}
                    onClick={(event) => openMessage(message, event.currentTarget)}
                    className="min-h-12 min-w-12 cursor-pointer rounded-sm py-2 text-left underline underline-offset-4"
                  >
                    {message.title}
                  </button>
                </h2>
                {others.length ? (
                  <>
                    {messageMeta(message, `${baseId}-meta`)}
                    {/* A block wrapper keeps the inline source link off the disclosure's line. */}
                    <div className="mt-2">
                      <button
                        ref={toggleRef}
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={listId}
                        onClick={() => setExpanded((open) => !open)}
                        className="min-h-12 min-w-12 cursor-pointer rounded-md border border-current px-4 py-2 text-sm font-semibold"
                      >
                        {expanded ? "Dölj fler VMA" : `Visa ${others.length} fler VMA`}
                      </button>
                    </div>
                    <ul id={listId} hidden={!expanded} className="mt-2 space-y-3">
                      {others.map((other, index) => (
                        <li key={other.id}>
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-describedby={`${baseId}-meta-${index}`}
                            data-vma-id={other.id}
                            onClick={(event) => openMessage(other, event.currentTarget)}
                            onFocus={() => {
                              focusedListEntry.current = other.id
                            }}
                            onBlur={() => {
                              if (focusedListEntry.current === other.id) {
                                focusedListEntry.current = null
                              }
                            }}
                            className="min-h-12 min-w-12 cursor-pointer rounded-sm py-2 text-left font-bold underline underline-offset-4"
                          >
                            {other.title}
                          </button>
                          {messageMeta(other, `${baseId}-meta-${index}`)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <a
                  href={message.source.url}
                  className="mt-1 inline-flex min-h-12 min-w-12 items-center py-2 text-sm underline underline-offset-4"
                >
                  Källa: {message.source.name}
                </a>
              </>
            ) : null}
            <p
              role="status"
              aria-atomic="true"
              className={statusLines.length ? "text-sm" : "sr-only"}
            >
              {statusLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            {!offline && (unavailable || stale || uncertain || retrying) ? (
              <button
                type="button"
                disabled={retrying}
                onClick={retry}
                className="mt-2 min-h-12 min-w-12 rounded-md border border-current px-4 py-2 text-sm font-semibold disabled:opacity-70"
              >
                {retrying ? "Kontrollerar…" : "Försök igen"}
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  )
}

export default VmaBanner
