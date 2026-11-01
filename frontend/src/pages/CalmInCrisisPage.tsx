import CalmHeroMotif from "../components/CalmHeroMotif"
import CalmIcon, { type CalmIconName } from "../components/CalmIcon"

interface AdviceCard {
  id: string
  icon: CalmIconName
  title: string
  text: string
}

const ADVICE_CARDS: readonly AdviceCard[] = [
  {
    id: "pause",
    icon: "pause",
    title: "Stanna upp",
    text: "Ta en kort paus. Rikta uppmärksamheten mot det som händer just nu och vad du behöver göra härnäst.",
  },
  {
    id: "breathe",
    icon: "breath",
    title: "Andas lugnt",
    text: "Ta tre lugna andetag och rikta hela din uppmärksamhet mot hur det känns att andas in och andas ut.",
  },
  {
    id: "one-step",
    icon: "steps",
    title: "Ta en sak i taget",
    text: "Följ aktuella säkerhetsinstruktioner och börja med det viktigaste. Du kan också gå till Krisinformation för aktuella råd eller läsa information som du tidigare har sparat offline.",
  },
  {
    id: "support",
    icon: "support",
    title: "Sök stöd",
    text: "Prata med någon som du litar på och berätta hur du känner. Testa att begränsa din nyhetskonsumtion om nyheterna gör dig mer orolig eller får dig att må dåligt.",
  },
]

const SOURCES = [
  {
    href: "https://www.1177.se/liv--halsa/stresshantering-och-somn/mindfulness/",
    label: "1177 – Mindfulness",
  },
  {
    href: "https://www.krisinformation.se/din-beredskap/stod-vid-oro-och-kris/stodlinjer/",
    label: "Krisinformation.se – Stödlinjer och hjälp",
  },
  {
    href: "https://www.sosalarm.se/112-och-andra-viktiga-nummer/112-appen/fragor-och-svar/ringa-112/nar-ska-jag-ringa-112/",
    label: "SOS Alarm – När ska jag ringa 112?",
  },
] as const

const CARD_CLASSES = "overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm"

/** The signature blue/amber top bar from `CrisisCard`, without its hover state. */
const ACCENT_BAR = (
  <div className="flex h-1.5 w-full" aria-hidden="true">
    <span className="h-full flex-1 bg-blue-900" />
    <span className="h-full w-8 bg-amber-400" />
  </div>
)

/**
 * Static "Lugn i kris" page with short, source-based advice for staying focused during a crisis.
 *
 * It stores and fetches nothing, so it is readable offline. The advice never replaces VMA or
 * other official instructions. The amber dots (hero motif and divider) are decoration only.
 */
function CalmInCrisisPage() {
  return (
    <section>
      <div className={CARD_CLASSES}>
        {ACCENT_BAR}
        <div className="flex flex-col items-center gap-3 p-6 sm:flex-row sm:gap-8 sm:p-10">
          <div className="min-w-0 flex-1">
            <h1
              id="page-heading"
              tabIndex={-1}
              className="wrap-anywhere text-3xl font-bold text-blue-900"
            >
              Lugn i kris
            </h1>
            <p className="mt-2 text-lg font-semibold text-blue-900 sm:mt-3 sm:text-xl">
              Andas. Fokusera. Ta nästa steg.
            </p>
            <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700 sm:mt-4 sm:text-lg">
              Stress och oro kan göra det svårare att tänka klart i en kris. Här får du några enkla
              steg som kan hjälpa dig att hitta lugn, fokusera på det viktigaste och ta nästa steg.
            </p>
          </div>
          <CalmHeroMotif className="size-20 shrink-0 sm:size-40" />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-blue-900 bg-blue-50 p-6">
        <h2 className="wrap-anywhere text-xl font-bold text-blue-900">Vid akut fara</h2>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-slate-800">
          Vid akut fara – följ aktuella säkerhetsinstruktioner och ring 112 vid behov.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {ADVICE_CARDS.map((card) => (
          <div key={card.id} className={CARD_CLASSES}>
            {ACCENT_BAR}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-900">
                  <CalmIcon name={card.icon} />
                </span>
                <h2 className="wrap-anywhere min-w-0 flex-1 text-xl font-bold text-blue-900">
                  {card.title}
                </h2>
              </div>
              <p className="mt-4 text-base leading-relaxed text-slate-700">{card.text}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-prose text-sm text-slate-600">
        Råden är allmän information och ersätter inte vård eller professionellt stöd.
      </p>

      <div aria-hidden="true" className="my-10 flex items-center gap-4">
        <span className="h-px flex-1 bg-blue-200" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="h-px flex-1 bg-blue-200" />
      </div>

      <section aria-labelledby="calm-sources-heading" className={CARD_CLASSES}>
        {ACCENT_BAR}
        <div className="p-6 sm:p-8">
          <h2 id="calm-sources-heading" className="text-lg font-semibold text-blue-900">
            Källor
          </h2>
          <p className="mt-3 text-slate-700">Råden bygger på information från följande källor:</p>
          <ul className="mt-4 space-y-2">
            {SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4 hover:text-blue-700"
                >
                  {source.label} (öppnas i ny flik)
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">Länkarna kräver internetanslutning.</p>
        </div>
      </section>
    </section>
  )
}

export default CalmInCrisisPage
