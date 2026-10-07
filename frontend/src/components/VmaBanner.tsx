import type { VmaMessage } from "../types/vma"

interface VmaBannerProps {
  message: VmaMessage | null
  hasMore: boolean
  uncertain: boolean
  loading: boolean
  retrying: boolean
  failed: boolean
  lastCheckedAt: string | null
  retry: () => void
}

const checkTimeFormat = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Stockholm",
})

/**
 * Presents one active warning or a neutral VMA request status without performing I/O.
 *
 * Renders upstream titles as plain text and keeps a stable live region across route changes.
 * The scrollable region preserves complete long titles within a bounded part of the viewport.
 *
 * @param message The selected active warning, or null when none can be displayed.
 * @param hasMore Indicates additional active warnings outside this ticket's single-message view.
 * @param uncertain Indicates incomplete or unknown validity information.
 * @param loading Indicates a pending initial request or manual retry.
 * @param retrying Keeps the retry control present and disabled during a manual request.
 * @param failed Indicates that the latest request failed, independently of retained data.
 * @param lastCheckedAt Time of the last successful request, not a local expiry check.
 * @param retry Starts a guarded manual request.
 */
function VmaBanner({
  message,
  hasMore,
  uncertain,
  loading,
  retrying,
  failed,
  lastCheckedAt,
  retry,
}: VmaBannerProps) {
  const visible = Boolean(message || loading || failed || uncertain)
  const statusText = loading
    ? "Kontrollerar VMA…"
    : failed
      ? "VMA-status kunde inte kontrolleras."
      : uncertain
        ? "VMA-informationen kan vara ofullständig."
        : null

  return (
    <>
      <div role="alert" aria-atomic="true" className="sr-only">
        {message ? (
          <span key={message.id}>
            VMA: {message.title} {hasMore ? "Fler aktiva VMA finns." : ""}
          </span>
        ) : null}
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
                <h2 className="mt-1 text-lg leading-snug font-bold sm:text-xl">{message.title}</h2>
                {hasMore ? <p className="mt-2">Fler aktiva VMA finns.</p> : null}
                <a
                  href={message.source.url}
                  className="mt-1 inline-flex min-h-12 min-w-12 items-center py-2 text-sm underline underline-offset-4"
                >
                  Källa: {message.source.name}
                </a>
              </>
            ) : null}
            <p role="status" aria-atomic="true" className={statusText ? "text-sm" : "sr-only"}>
              {statusText}
              {statusText && lastCheckedAt ? (
                <>
                  {" "}
                  Senast kontrollerat{" "}
                  <time dateTime={lastCheckedAt}>
                    {checkTimeFormat.format(new Date(lastCheckedAt))}
                  </time>
                  .
                </>
              ) : null}
            </p>
            {failed || uncertain || retrying ? (
              <button
                type="button"
                disabled={loading}
                onClick={retry}
                className="mt-2 min-h-12 min-w-12 rounded-md border border-current px-4 py-2 text-sm font-semibold disabled:opacity-70"
              >
                {loading ? "Försöker igen…" : "Försök igen"}
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  )
}

export default VmaBanner
