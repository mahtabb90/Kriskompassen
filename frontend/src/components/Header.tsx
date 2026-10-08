import ConnectionStatus from "./ConnectionStatus"
import ModeToggle from "./ModeToggle"

/**
 * Renders shared branding, the mode toggle and connectivity status within a ModeProvider.
 *
 * Reserves the top device inset when no VMA notice owns it.
 *
 * @param reserveTopInset Whether the header is the first visible region in the page.
 */
function Header({ reserveTopInset = true }: { reserveTopInset?: boolean }) {
  return (
    <header className={"bg-white " + (reserveTopInset ? "pt-[env(safe-area-inset-top)]" : "")}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Source order is the mobile order (brand, tagline, status, mode) so reading and tab
            order match what is shown; from md the grid restores the brand and mode in one row. */}
        <div className="flex flex-col items-start gap-3 md:grid md:grid-cols-[1fr_auto] md:gap-0">
          <div className="flex flex-wrap items-center gap-3 md:col-start-1 md:row-start-1 md:self-center">
            <img src="/kriskompassen-logo.png" alt="" className="h-12 w-12 sm:h-14 sm:w-14" />

            <p
              className={
                "min-w-0 text-2xl font-bold tracking-tight wrap-anywhere " +
                "text-blue-900 sm:text-3xl"
              }
            >
              KrisKompassen
            </p>
          </div>

          <p className="text-base text-slate-600 md:col-span-2 md:row-start-2 md:mt-3">
            Din kompass när krisen kommer.
          </p>

          <div className="self-stretch md:col-span-2 md:row-start-3 md:mt-3 md:self-auto">
            <ConnectionStatus />
          </div>

          <div className="md:col-start-2 md:row-start-1 md:self-center md:justify-self-end">
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
