import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { useAddress } from "../hooks/useAddress"
import { LOW_ACCURACY_THRESHOLD_METERS, type Address, type AddressLabel } from "../types/address"

type LabelKind = AddressLabel["kind"]

/** Flags an address as particularly imprecise when its device fix was unusually uncertain. */
function describeGeolocatedAddress(address: Address): string {
  if (address.accuracy !== undefined && address.accuracy > LOW_ACCURACY_THRESHOLD_METERS) {
    const radiusKm = (address.accuracy / 1000).toFixed(1)
    return (
      `Hämtad automatiskt – positionen är mycket osäker (ca ±${radiusKm} km), ` +
      "kontrollera adressen extra noga"
    )
  }
  return "Hämtad automatiskt – ungefärlig position, kontrollera att den stämmer"
}

interface AddressSectionProps {
  /** Called whenever typing or fetching a position resolves a new address to add. */
  onResolved: (address: Address) => void
  /** Selected label for the resolved address, shown next to the address preview. */
  labelKind: LabelKind
  customLabelText: string
  onLabelKindChange: (kind: LabelKind) => void
  onCustomLabelTextChange: (text: string) => void
  /** Submits the resolved address together with the chosen label. */
  onSave: (event: FormEvent<HTMLFormElement>) => void
  saveError: string
}

/**
 * Lets the user compose one address by typing it or by fetching the device's position.
 *
 * Both paths are always visible rather than gated behind a mode switch, so the "Hämta min
 * position" button stays a clearly visible control per the ticket's acceptance criteria.
 * A geolocated address is always labelled approximate; "Ändra adress" refills the form with
 * the resolved text for correction rather than hiding either control. Once an address is
 * resolved, the label picker and "Spara adress" appear in the same preview card; the caller
 * still owns the label/save state (and calls `onResolved` to track the pending address) via
 * `onSave`.
 */
function AddressSection({
  onResolved,
  labelKind,
  customLabelText,
  onLabelKindChange,
  onCustomLabelTextChange,
  onSave,
  saveError,
}: AddressSectionProps) {
  const { address, loading, failed, errorMessage, submitManualAddress, requestLocation } =
    useAddress()
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const helpTextId = useId()
  const geolocationSupported = "geolocation" in navigator

  useEffect(() => {
    if (address) onResolved(address)
  }, [address, onResolved])

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
        Lägg till adress
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-700">
        Ange en adress eller hämta din position. Du väljer en etikett och sparar den i listan nedan.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <label htmlFor="address-input" className="text-sm font-semibold text-slate-700">
          Adress
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
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
            className="min-h-12 rounded-xl border-2 border-blue-900 px-4 py-2 text-base text-slate-900 sm:flex-1"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950"
          >
            Bekräfta adress
          </button>
        </div>
        <p id="address-format-hint" className="text-xs text-slate-500">
          Skriv gatuadress, nummer och ort, t.ex. &quot;Storgatan 1, Stockholm&quot;, så blir
          adressen tydlig och går inte att förväxla med en gata med samma namn på en annan ort.
        </p>
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
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-base font-semibold text-slate-900">{address.text}</p>
            <p className="text-sm text-slate-600">
              {address.source === "manual"
                ? "Angiven manuellt"
                : describeGeolocatedAddress(address)}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

              <form onSubmit={onSave} className="flex flex-col gap-3 sm:w-64 sm:flex-shrink-0">
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-semibold text-slate-700">
                    Vad är det här för plats?
                  </legend>
                  <div className="flex flex-row flex-wrap gap-x-4 gap-y-1">
                    {(["hem", "arbete", "annan"] as const).map((kind) => (
                      <label
                        key={kind}
                        className="flex min-h-12 items-center gap-2 text-base text-slate-900"
                      >
                        <input
                          type="radio"
                          name="label-kind"
                          value={kind}
                          checked={labelKind === kind}
                          onChange={() => onLabelKindChange(kind)}
                          className="h-5 w-5"
                        />
                        {kind === "hem" ? "Hem" : kind === "arbete" ? "Arbete" : "Annan"}
                      </label>
                    ))}
                  </div>
                  {labelKind === "annan" && (
                    <input
                      type="text"
                      required
                      placeholder="T.ex. Sommarstuga"
                      aria-label="Egen etikett"
                      value={customLabelText}
                      onChange={(event) => onCustomLabelTextChange(event.target.value)}
                      className="min-h-12 max-w-sm rounded-xl border-2 border-blue-900 px-4 py-2 text-base text-slate-900"
                    />
                  )}
                </fieldset>
                <button
                  type="submit"
                  className="inline-flex min-h-12 min-w-12 items-center justify-center self-start rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950"
                >
                  Spara adress
                </button>
                <div role="alert" className="text-sm font-medium text-red-800">
                  {saveError}
                </div>
              </form>
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
