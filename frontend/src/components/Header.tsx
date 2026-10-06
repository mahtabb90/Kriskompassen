/**
 * Renders the shared brand header, reserving the top device inset when no VMA notice owns it.
 *
 * @param reserveTopInset Whether the header is the first visible region in the page.
 */
function Header({ reserveTopInset = true }: { reserveTopInset?: boolean }) {
  return (
    <header className={"bg-white " + (reserveTopInset ? "pt-[env(safe-area-inset-top)]" : "")}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-3">
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
        <p className="mt-3 text-base text-slate-600">Din kompass när krisen kommer.</p>
      </div>
    </header>
  )
}

export default Header
