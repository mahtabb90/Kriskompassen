/** Static, offline-capable guidance about shelters in general, sourced from Krisinformation.se. */
function ShelterGeneralInfo() {
  return (
    <>
      <h2 className="text-xl font-bold text-blue-900">Om skyddsrum</h2>
      <p className="mt-3 max-w-prose text-slate-700">
        Skyddsrum är utrymmen som ska skydda mot tryckvåg och splitter vid höjd beredskap eller
        krig. De är märkta med en skylt vid entrén: en orange ruta med en blå triangel.
      </p>
      <p className="mt-3 max-w-prose text-slate-700">
        Om skyddsrummen behöver tas i bruk har fastighetsägaren upp till två dygn på sig att ställa
        i ordning dem med vatten, värme, ventilation och toaletter. Ta själv med dig mat, vatten,
        mediciner, hygienartiklar, varma kläder, ficklampa och mobiltelefon med laddare.
      </p>
      <a
        href="https://www.krisinformation.se/forbered-dig/skyddsrum-utrymning-och-varningssystem/skyddsrum/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-12 items-center font-medium text-blue-900 underline underline-offset-4"
      >
        Läs mer om skyddsrum hos Krisinformation.se
        <span className="sr-only"> (öppnas i ny flik)</span>
      </a>
    </>
  )
}

export default ShelterGeneralInfo
