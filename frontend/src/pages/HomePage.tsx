import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import CalmIcon from "../components/CalmIcon"
import CompassHeroMotif from "../components/CompassHeroMotif"
import CrisisIcon from "../components/CrisisIcon"
import HomeFeatureIcon from "../components/HomeFeatureIcon"
import { navigationItems } from "../components/navigationItems"

interface Feature {
  to: string
  description: string
  icon: ReactNode
  /** Primary product functions get a larger card; the others are supporting cards. */
  prominent: boolean
}

const FEATURES: readonly Feature[] = [
  {
    to: "/crisis",
    description: "Läs tydliga råd för olika krissituationer och spara viktig information offline.",
    icon: <HomeFeatureIcon name="info" />,
    prominent: true,
  },
  {
    to: "/crisis-kit",
    description: "Förbered och håll koll på sådant som kan behövas hemma vid en kris.",
    icon: <CrisisIcon name="other" />,
    prominent: true,
  },
  {
    to: "/skyddsrum",
    description: "Lägg till din adress och hitta skyddsrum nära dig när du behöver det.",
    icon: <HomeFeatureIcon name="shelter" />,
    prominent: false,
  },
  {
    to: "/installningar",
    description: "Spara viktig lokal information, till exempel adresser som är relevanta för dig.",
    icon: <HomeFeatureIcon name="location" />,
    prominent: false,
  },
  {
    to: "/lugn-i-kris",
    description:
      "Få enkla råd som kan hjälpa dig att behålla fokus och hantera stress i en krissituation.",
    icon: <CalmIcon name="breath" />,
    prominent: false,
  },
]

const VALUE_POINTS = ["Ingen inloggning", "Spara viktig information offline", "Tydliga källor"]

/** The card title is the shared navigation label, so labels and paths are not duplicated. */
function labelFor(to: string): string {
  const item = navigationItems.find((candidate) => candidate.to === to)
  if (!item) throw new Error(`No navigation item for ${to}`)
  return item.label
}

/** The signature blue/amber top bar, local to this page. */
const ACCENT_BAR = (
  <div className="flex h-1.5 w-full" aria-hidden="true">
    <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
    <span className="h-full w-8 bg-amber-400" />
  </div>
)

function FeatureCard({ feature }: { feature: Feature }) {
  const { to, description, icon, prominent } = feature
  const id = `home-feature-${to.slice(1)}`
  const title = labelFor(to)

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm transition-[border-color,box-shadow] duration-150 ease-out hover:border-blue-400 hover:shadow-md ${
        prominent ? "md:col-span-3" : "md:col-span-2"
      }`}
    >
      {ACCENT_BAR}
      <Link
        to={to}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        // The card clips overflow, so the focus outline is drawn inside the link instead.
        className={`flex flex-1 flex-col focus-visible:-outline-offset-4 ${
          prominent ? "p-6 sm:p-8" : "p-6"
        }`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`flex shrink-0 items-center justify-center rounded-full text-blue-900 ${
              prominent ? "size-14 border border-blue-200 bg-blue-100" : "size-12 bg-blue-50"
            }`}
          >
            {icon}
          </span>
          <h3
            id={`${id}-title`}
            className={`wrap-anywhere min-w-0 flex-1 font-bold text-blue-900 ${
              prominent ? "text-2xl" : "text-xl"
            }`}
          >
            {title}
          </h3>
        </div>
        <p id={`${id}-description`} className="mt-4 text-base leading-relaxed text-slate-600">
          {description}
        </p>
        {/* Hidden from assistive technology: the link's name already comes from the title. */}
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-2 pt-4 text-base font-semibold text-blue-900"
        >
          Öppna
          <svg
            focusable="false"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 shrink-0"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </div>
  )
}

/**
 * Start page: a hero that explains what KrisKompassen is, two calls to action, and an overview of
 * the app's features as links to their existing routes.
 *
 * The page is static and performs no I/O. Its `h1` replaces the former "Hem" heading, so the
 * document title follows it.
 */
function HomePage() {
  return (
    <section>
      <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm">
        {ACCENT_BAR}
        <div className="flex flex-col gap-8 p-6 sm:p-10 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <h1
              id="page-heading"
              tabIndex={-1}
              className="wrap-anywhere text-center text-3xl font-bold text-blue-900 sm:text-left sm:text-4xl"
            >
              Din kompass i en kris
            </h1>
            <p className="mt-3 text-center text-base font-semibold text-blue-900 sm:text-left sm:text-lg">
              Förbered dig. Hitta rätt. Behåll lugnet.
            </p>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700 sm:text-lg">
              Samla viktig krisinformation, hitta skyddsrum nära dina adresser och spara information
              för offline-läge – på ett ställe.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/crisis"
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950 active:bg-blue-950"
              >
                Se krisinformation
              </Link>
              <Link
                to="/crisis-kit"
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50 active:bg-blue-50"
              >
                Öppna min krislåda
              </Link>
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-slate-600 sm:justify-start">
              {VALUE_POINTS.map((point) => (
                <li key={point}>
                  <span aria-hidden="true" className="font-bold text-blue-900">
                    ✓
                  </span>{" "}
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <CompassHeroMotif className="hidden size-56 shrink-0 md:block" />
        </div>
      </div>

      <section aria-labelledby="home-features-heading" className="mt-10">
        <h2 id="home-features-heading" className="wrap-anywhere text-xl font-bold text-blue-900">
          Det här kan du göra i KrisKompassen
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.to} feature={feature} />
          ))}
        </div>
      </section>
    </section>
  )
}

export default HomePage
