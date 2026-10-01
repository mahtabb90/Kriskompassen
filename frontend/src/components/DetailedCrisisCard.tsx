import { Link, useParams } from "react-router-dom"
import { mockCrisisData } from "../data/mockCrisisData"

/**
 * Renders detailed information for the selected crisis item.
 */
function DetailedCrisisCard() {
  const { id } = useParams()

  const item = mockCrisisData.find((crisis) => crisis.id === id)

  if (!item) {
    return (
      <section>
        <h1 className="text-3xl font-bold text-blue-900">
          Krisinformationen hittades inte
        </h1>

        <Link
          to="/crisis"
          className="mt-6 inline-block font-medium text-blue-900 underline"
        >
          ← Tillbaka till krisinformation
        </Link>
      </section>
    )
  }

  return (
    <article className="rounded-2xl border border-blue-200/80 bg-white shadow-sm">
      <div className="flex h-1.5 w-full" aria-hidden="true">
        <span className="h-full flex-1 bg-blue-900" />
        <span className="h-full w-8 bg-amber-400" />
      </div>

      <div className="p-6 sm:p-8">
        <Link
          to="/crisis"
          className="mb-6 inline-block font-medium text-blue-900 underline"
        >
          ← Tillbaka till krisinformation
        </Link>

        <h1 className="text-3xl font-bold text-blue-900">{item.title}</h1>

        <p className="mt-6 text-base leading-relaxed text-slate-700">
          {item.content}
        </p>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">
            Källa: <span className="font-medium">{item.source}</span>
          </p>

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-blue-900 underline"
            >
              Läs mer på källan
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default DetailedCrisisCard