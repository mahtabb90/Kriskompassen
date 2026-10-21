import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { useAddress } from "../hooks/useAddress"
import {
  LOW_ACCURACY_THRESHOLD_METERS,
  type Address,
  type AddressLabel,
  type GeocodeCandidate,
} from "../types/address"
import { isValidLatLon, parseCoordinates } from "../utils/coordinates"

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
 * Lets the user compose one address by typing it, pasting coordinates, or fetching the
 * device's position.
 *
 * Both paths are always visible rather than gated behind a mode switch, so the "Hämta min
 * position" button stays a clearly visible control per the ticket's acceptance criteria.
 * A geolocated or coordinates address is always labelled approximate; "Ändra adress" refills
 * the form with the resolved text for correction rather than hiding either control. Once an
 * address is resolved, the label picker and "Spara adress" appear in the same preview card; the
 * caller still owns the label/save state (and calls `onResolved` to track the pending address)
 * via `onSave`.
 *
 * The same text field accepts either a street address or a latitude/longitude pair (decimal
 * degrees, separated by a comma and/or whitespace), e.g. pasted from another map service. Text
 * shaped like coordinates skips the address search and is instead range-checked and
 * reverse-geocoded exactly like a fetched device position, producing an approximate,
 * re-lookupable `source: "coordinates"` address; out-of-range text shows an inline error before
 * any network call. Ordinary address text is forward-geocoded through the backend: a unique
 * match resolves immediately, no match reports an error, and more than one match (e.g.
 * "Storgatan 1" exists in several municipalities) shows a list for the user to pick from. The
 * field keeps what was typed until a lookup actually succeeds, so a failed lookup never forces
 * the user to retype it, and while "choosing" is in progress the user can still see and refine
 * what they typed alongside the candidate list.
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
  const {
    address,
    loading,
    resolvingSource,
    choosing,
    candidates,
    failed,
    errorMessage,
    submitManualAddress,
    selectCandidate,
    requestLocation,
    submitCoordinates,
  } = useAddress()
  const [inputValue, setInputValue] = useState("")
  const [coordinateRangeError, setCoordinateRangeError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const candidatesHeadingRef = useRef<HTMLHeadingElement>(null)
  const helpTextId = useId()
  const geolocationSupported = "geolocation" in navigator

  // Adjusted during render (React's documented pattern for resetting state when a value
  // changes, using state rather than a ref so it survives Strict Mode's extra render) instead
  // of in an effect, since this is local UI state, not a call to an external system. Only a
  // final resolution clears the input - while "choosing" is in progress, or after a failed
  // lookup, the user can still see and refine what they typed.
  const [previousAddress, setPreviousAddress] = useState<Address | null>(null)
  if (address !== previousAddress) {
    setPreviousAddress(address)
    if (address) setInputValue("")
  }

  useEffect(() => {
    if (address) onResolved(address)
  }, [address, onResolved])

  useEffect(() => {
    if (choosing) candidatesHeadingRef.current?.focus()
  }, [choosing])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const coordinates = parseCoordinates(inputValue.trim())

    if (coordinates) {
      if (!isValidLatLon(coordinates.lat, coordinates.lon)) {
        setCoordinateRangeError(
          "Koordinaterna är utanför giltigt intervall (latitud -90 till 90, longitud -180 till 180)."
        )
        return
      }
      setCoordinateRangeError("")
      submitCoordinates(coordinates.lat, coordinates.lon)
      return
    }

    setCoordinateRangeError("")
    submitManualAddress(inputValue)
  }

  function handleEditAddress() {
    setInputValue(address?.text ?? "")
    inputRef.current?.focus()
  }

  function candidateKey(candidate: GeocodeCandidate, index: number): string {
    return `${candidate.lat}-${candidate.lon}-${index}`
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
            placeholder="T.ex. Storgatan 1, Stockholm eller 59.3293, 18.0686"
            aria-describedby="address-format-hint"
            value={inputValue}
            onChange={(event) => {
              event.target.setCustomValidity("")
              setInputValue(event.target.value)
              setCoordinateRangeError("")
            }}
            onInvalid={(event) => {
              event.currentTarget.setCustomValidity("Ange en adress eller koordinater.")
            }}
            className="min-h-12 rounded-xl border-2 border-blue-900 px-4 py-2 text-base text-slate-900 sm:flex-1"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
          >
            {resolvingSource === "manual"
              ? "Söker adress…"
              : resolvingSource === "coordinates"
                ? "Slår upp koordinater…"
                : "Bekräfta adress"}
          </button>
        </div>
        <p id="address-format-hint" className="text-xs text-slate-500">
          Skriv gatuadress, nummer och ort, t.ex. &quot;Storgatan 1, Stockholm&quot;, så blir
          adressen tydlig och går inte att förväxla med en gata med samma namn på en annan ort. Du
          kan även klistra in koordinater (latitud, longitud), t.ex. &quot;59.3293, 18.0686&quot;.
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
        {resolvingSource === "geolocated" ? "Hämtar position…" : "Hämta min position"}
      </button>
      {!geolocationSupported && (
        <p id={helpTextId} className="mt-1 text-sm text-slate-600">
          Den här webbläsaren stöder inte platshämtning. Ange adressen manuellt istället.
        </p>
      )}

      {choosing && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <h3
            ref={candidatesHeadingRef}
            tabIndex={-1}
            className="text-base font-semibold text-slate-900"
          >
            Flera adresser hittades — välj rätt:
          </h3>
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate, index) => (
              <li key={candidateKey(candidate, index)}>
                <button
                  type="button"
                  onClick={() => selectCandidate(candidate)}
                  className="min-h-12 w-full rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-left text-sm font-semibold text-blue-900 hover:bg-blue-50"
                >
                  {candidate.address}
                </button>
              </li>
            ))}
          </ul>
        </div>
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
                {address.source === "coordinates" &&
                  address.lat !== undefined &&
                  address.lon !== undefined && (
                    <button
                      type="button"
                      onClick={() =>
                        submitCoordinates(address.lat as number, address.lon as number)
                      }
                      disabled={loading}
                      className="min-h-12 min-w-12 rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-60"
                    >
                      Slå upp igen
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

            {(address.source === "geolocated" || address.source === "coordinates") && (
              <p className="text-xs text-slate-500">Positionsdata: © OpenStreetMap-bidragsgivare</p>
            )}
          </div>
        )}
      </div>

      <div role="alert" className="mt-3 text-sm font-medium text-red-800">
        {coordinateRangeError || (failed ? errorMessage : "")}
      </div>
    </section>
  )
}

export default AddressSection
