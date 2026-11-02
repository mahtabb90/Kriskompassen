import { useId } from "react"

interface ExternalLinkProps {
  href: string
  label: string
  isOnline: boolean
  className?: string
}

/**
 * Links to an external page in a new tab, and says so.
 *
 * The visible label is followed by a visually hidden "(öppnas i ny flik)" and a
 * decorative external-link icon, so the accessible name starts with the visible text and also
 * announces the new tab, without an `aria-label`. The page opens with `rel="noopener noreferrer"`.
 *
 * While `isOnline` is false, a "Kräver internetanslutning." note follows the link and describes
 * it through `aria-describedby`. The link stays available, because the browser's connectivity
 * report can be wrong. The caller passes `isOnline` from `useMode()`, so this component reads no
 * context. It renders inline elements only, so it can sit inside a paragraph.
 *
 * @param props.href Absolute `https` URL of the external page.
 * @param props.label Visible Swedish link text.
 * @param props.isOnline Browser-reported connectivity.
 * @param props.className Extra classes for the link, e.g. spacing.
 */
function ExternalLink({ href, label, isOnline, className = "" }: ExternalLinkProps) {
  const noteId = useId()

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={isOnline ? undefined : noteId}
        className={`inline-flex min-h-12 items-center gap-2 font-medium wrap-anywhere text-blue-900 underline underline-offset-4 ${className}`}
      >
        {/* The space sits outside the hidden span, in the same inline span as the label, because
            name computation drops whitespace at the edge of an element or flex item. */}
        <span>
          {label} <span className="sr-only">(öppnas i ny flik)</span>
        </span>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0"
        >
          <path d="M14 4h6v6M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
      {!isOnline && (
        <span id={noteId} className="block text-sm text-slate-600">
          Kräver internetanslutning.
        </span>
      )}
    </>
  )
}

export default ExternalLink
