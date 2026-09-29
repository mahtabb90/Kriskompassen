function HomePage() {
  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Hem
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
        KrisKompassen är en webbapplikation under utveckling som är utformad för att hjälpa människor att snabbt hitta tydlig och relevant lokal information vid nödsituationer och större samhällsstörningar.
      </p>
    </section>
  )
}

export default HomePage
