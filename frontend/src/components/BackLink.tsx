import { Link } from "react-router-dom"

interface BackLinkProps {
  to: string
  label: string
}

/**
 * Renders the shared "back" link placed above a page's heading, leading to a fixed parent page.
 *
 * It is an ordinary router link rather than `history.back()`, so it leads to the same page when
 * the current page was opened directly or offline. The arrow is decoration hidden from assistive
 * technology, so the accessible name is the label alone. The link includes its spacing to the
 * heading below it.
 *
 * @param to The parent page's path.
 * @param label The visible text, which is also the link's accessible name.
 */
function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="mb-6 inline-flex min-h-12 items-center gap-1 font-medium text-blue-900 underline underline-offset-4"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  )
}

export default BackLink
