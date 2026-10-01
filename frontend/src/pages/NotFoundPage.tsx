import { Link } from "react-router-dom"

function NotFoundPage() {
  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Sidan kunde inte hittas
      </h1>
      <p className="mt-4 max-w-prose leading-relaxed text-slate-700">
        Adressen finns inte eller sidan är ännu inte tillgänglig. Du kan gå till startsidan eller
        läsa vår krisinformation.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/"
          className={
            "inline-flex min-h-12 items-center rounded-xl bg-blue-900 px-5 py-3 " +
            "font-semibold text-white underline underline-offset-4 hover:bg-blue-950"
          }
        >
          Till startsidan
        </Link>
        <Link
          to="/crisis"
          className={
            "inline-flex min-h-12 items-center rounded-xl border border-blue-900 px-5 py-3 " +
            "font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-50"
          }
        >
          Visa krisinformation
        </Link>
      </div>
    </section>
  )
}

export default NotFoundPage
