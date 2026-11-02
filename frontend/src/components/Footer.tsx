/**
 * Renders the shared page footer: a slim row with a small compass icon and a brand message on
 * the left and the copyright line on the right, stacked on narrow screens.
 *
 * It sits after `main` in `AppLayout`, so it is the page's `contentinfo` landmark. It has no
 * interactive elements, and the compass icon is decoration hidden from assistive technology.
 *
 * The clearance for the fixed mobile menu bar is a separate spacer after the footer, not footer
 * padding, so the visible footer stays slim. The spacer is as tall as the measured bar
 * (`--navigation-height`, which includes the bottom safe-area inset and is 0 from 48rem), so the
 * footer ends just above the bar when scrolled to the end.
 */
function Footer() {
  return (
    <>
      <footer className="border-t border-blue-200 bg-slate-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-0 px-4 py-1.5 wrap-anywhere sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 md:py-3">
          <div className="flex items-start gap-2 md:items-center">
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 size-5 shrink-0 text-blue-900 md:mt-0"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z" />
            </svg>
            <p className="text-[13px] leading-snug text-slate-700 md:text-sm md:leading-5">
              Din kompass till tydlig information och bättre beredskap – före och under en kris.
            </p>
          </div>
          <p className="text-right text-sm text-slate-600">© 2026 KrisKompassen</p>
        </div>
      </footer>
      <div aria-hidden="true" className="h-[var(--navigation-height,0px)] shrink-0" />
    </>
  )
}

export default Footer
