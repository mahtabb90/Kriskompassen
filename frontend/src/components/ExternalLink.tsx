import { useId } from "react"

interface ExternalLinkProps {
  href: string
  label: string
  isOnline: boolean
  className?: string
}

/**
 * Splits a label before its last word, so the icon can be kept on the same line as that word.
 *
 * @returns The text up to and including the last space, and the last word.
 */
function splitBeforeLastWord(label: string): [string, string] {
  const lastSpace = label.lastIndexOf(" ")
  return [label.slice(0, lastSpace + 1), label.slice(lastSpace + 1)]
}

/**
 * Links to an external page in a new tab, and says so.
 *
 * The visible label is followed by a decorative external-link icon and a visually hidden
 * "(öppnas i ny flik)", so the accessible name starts with the visible text and also announces
 * the new tab, without an `aria-label`. The page opens with `rel="noopener noreferrer"`.
 *
 * The link is an inline block, so a long label wraps like ordinary text and the icon follows
 * its last word; the two never break apart. Vertical padding keeps a 48px target on one line.
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
  const [leadingWords, lastWord] = splitBeforeLastWord(label)

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={isOnline ? undefined : noteId}
        className={`inline-block py-3 font-medium wrap-anywhere text-blue-900 underline underline-offset-4 ${className}`}
      >
        {leadingWords}
        <span className="whitespace-nowrap">
          {lastWord}
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-1.5 inline-block size-5 align-[-0.25em]"
          >
            <path d="M14 4h6v6M20 4l-9 9" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </span>
        {/* The space is its own text node, because name computation drops whitespace at the
            edge of an element such as the hidden span. */}{" "}
        <span className="sr-only">(öppnas i ny flik)</span>
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
