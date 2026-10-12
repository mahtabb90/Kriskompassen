import { useId, useRef, useState, type FormEvent } from "react"
import { useAddress } from "../hooks/useAddress"

/**
 * Lets the user confirm an address by typing it or by fetching the device's position.
 *
 * Both paths are always visible rather than gated behind a mode switch, so the "Hämta min
 * position" button stays a clearly visible control per the ticket's acceptance criteria.
 * A geolocated address is always labelled approximate; "Ändra adress" refills the form with
 * the current address text for correction rather than hiding either control.
 */
function AddressSection() {
  const { address, loading, failed, errorMessage, submitManualAddress, requestLocation } =
    useAddress()
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const helpTextId = useId()
  const geolocationSupported = "geolocation" in navigator

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitManualAddress(inputValue)
    setInputValue("")
  }

  function handleEditAddress() {
    setInputValue(address?.text ?? "")
    inputRef.current?.focus()
  }

  return (
    <section
      aria-labelledby="address-heading"
      className="mt-8 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 id="address-heading" className="text-xl font-bold text-blue-900">
        Din adress
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
        Ange din adress eller hämta din position. Adressen kan senare användas som utgångspunkt för
        att hitta närliggande skyddsrum.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1 sm:flex-1">
          <label htmlFor="address-input" className="text-sm font-semibold text-slate-700">
            Adress
          </label>
          <input
            id="address-input"
            ref={inputRef}
            type="text"
            autoComplete="street-address"
            required
            placeholder="T.ex. Storgatan 1, Stockholm"
            aria-describedby="address-format-hint"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="min-h-12 rounded-xl border-2 border-blue-900 px-4 py-2 text-base text-slate-900"
          />
          <p id="address-format-hint" className="text-xs text-slate-500">
            Skriv gatuadress, nummer och ort, t.ex. &quot;Storgatan 1, Stockholm&quot;, så blir
            adressen tydlig och går inte att förväxla med en gata med samma namn på en annan ort.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950"
        >
          Bekräfta adress
        </button>
      </form>

      <p className="my-3 text-sm font-medium text-slate-500">eller</p>

      <button
        type="button"
        onClick={requestLocation}
        disabled={loading || !geolocationSupported}
        aria-describedby={!geolocationSupported ? helpTextId : undefined}
        className={
          "inline-flex min-h-12 min-w-12 items-center justify-center self-start rounded-xl " +
          "border-2 border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 " +
          "hover:bg-blue-50 disabled:opacity-60"
        }
      >
        {loading ? "Hämtar position…" : "Hämta min position"}
      </button>
      {!geolocationSupported && (
        <p id={helpTextId} className="mt-1 text-sm text-slate-600">
          Den här webbläsaren stöder inte platshämtning. Ange adressen manuellt istället.
        </p>
      )}

      <div role="status">
        {address && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-base font-semibold text-slate-900">{address.text}</p>
            <p className="text-sm text-slate-600">
              {address.source === "manual"
                ? "Angiven manuellt"
                : "Hämtad automatiskt – ungefärlig position, kontrollera att den stämmer"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEditAddress}
                className="min-h-12 min-w-12 rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
              >
                Ändra adress
              </button>
              {address.source === "geolocated" && (
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={loading}
                  className="min-h-12 min-w-12 rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-60"
                >
                  Hämta ny position
                </button>
              )}
            </div>
            {address.source === "geolocated" && (
              <p className="text-xs text-slate-500">Positionsdata: © OpenStreetMap-bidragsgivare</p>
            )}
          </div>
        )}
      </div>

      <div role="alert" className="mt-3 text-sm font-medium text-red-800">
        {failed ? errorMessage : ""}
      </div>
    </section>
  )
}

export default AddressSection
