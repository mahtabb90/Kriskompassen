import { useId } from "react"
import InstallInstructionsContent from "./InstallInstructionsContent"

const platforms = [
  ["chrome-desktop", "Chrome på dator"],
  ["ios", "iPhone och iPad"],
  ["macos-safari", "Safari på Mac"],
] as const

/**
 * Keeps manual installation help available independently of browser offers and dismissed guidance.
 *
 * The native disclosure starts closed on each mount and keeps its state only in the document.
 */
function InstallHelpSection() {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id={headingId} className="text-xl font-bold text-blue-900">
        Installera appen
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed text-slate-700">
        Om installationsknappen eller instruktionen inte visas kan du följa anvisningarna för din
        webbläsare här.
      </p>
      <details className="mt-3">
        <summary className="min-h-12 cursor-pointer rounded-xl px-2 py-3 font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-50">
          Visa installationshjälp
        </summary>
        <ul className="mt-4 space-y-4 text-slate-700">
          {platforms.map(([platform, label]) => (
            <li key={platform}>
              <h3 className="font-semibold text-blue-900">{label}</h3>
              <p className="mt-1 max-w-prose leading-relaxed">
                <InstallInstructionsContent platform={platform} />
              </p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

export default InstallHelpSection
