import AddressIndicator from "./AddressIndicator"
import ConnectionStatus from "./ConnectionStatus"
import InstallAppButton from "./InstallAppButton"
import ModeToggle from "./ModeToggle"

/**
 * Renders shared branding, the "Sparad information" mode switch and connectivity status within
 * a ModeProvider.
 *
 * From 48rem the switch and active address align with the content edge, while installation sits
 * beside connectivity status on the same baseline as the address. Below 48rem the mobile menu
 * offers installation instead. Reserves the top device inset when no VMA notice owns it.
 *
 * @param reserveTopInset Whether the header is the first visible region in the page.
 */
function Header({ reserveTopInset = true }: { reserveTopInset?: boolean }) {
  return (
    <header className={"bg-white " + (reserveTopInset ? "pt-[env(safe-area-inset-top)]" : "")}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 wrap-anywhere sm:px-6 sm:py-8">
        {/* Source order is the mobile order (brand, tagline, status, mode) so reading and tab
            order match what is shown; from md the grid restores the brand and mode in one row.
            Status and address share the final grid row and align by their first text baseline.
            The switch spans the preceding rows, with a flexible third row absorbing longer help
            text without spreading the brand and tagline apart. */}
        <div
          className={
            "flex flex-col items-start gap-3 md:grid md:grid-cols-2 " +
            "md:grid-rows-[auto_auto_1fr_auto] md:gap-x-6 md:gap-y-0"
          }
        >
          <div className="flex flex-wrap items-center gap-3 md:col-start-1 md:row-start-1 md:self-start">
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

          <p className="text-base text-slate-600 md:col-start-1 md:row-start-2 md:mt-3">
            Din kompass när krisen kommer.
          </p>

          <div className="self-stretch md:col-start-1 md:row-start-4 md:mt-3 md:self-baseline">
            <ConnectionStatus
              action={
                <div className="empty:hidden max-md:hidden">
                  <InstallAppButton variant="text" />
                </div>
              }
            />
          </div>

          <div className="flex w-full min-w-0 max-w-xs flex-col items-start gap-2 md:contents">
            <div
              className={
                "w-full min-w-0 max-w-xs md:col-start-2 md:row-span-3 md:row-start-1 " +
                "md:-mr-2 md:self-start md:justify-self-end"
              }
            >
              <ModeToggle />
            </div>
            {/* The desktop offset compensates for the controls' px-2, aligning their visible
                right edges with the cards while retaining button padding and focus space. */}
            <div
              className={
                "w-full min-w-0 max-w-xs empty:hidden md:col-start-2 md:row-start-4 md:-mr-2 " +
                "md:self-baseline md:justify-self-end md:px-2 md:text-right"
              }
            >
              <AddressIndicator />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
