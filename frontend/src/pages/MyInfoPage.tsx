import { useEffect, useRef, useState, type FormEvent } from "react"
import AddressSection from "../components/AddressSection"
import RemoveAddressDialog from "../components/RemoveAddressDialog"
import { useAddresses } from "../context/addressContext"
import type { Address, AddressLabel, SavedAddress } from "../types/address"
import { describeAddressLabel } from "../utils/addressLabel"

type LabelKind = AddressLabel["kind"]

/**
 * Lets the user save several addresses, each with a label, and choose which one is active.
 *
 * The active address is the one other features (e.g. future shelter search) use as the
 * starting point. Saving the first address activates it automatically; later additions need
 * an explicit "Ange som aktuell plats".
 */
function MyInfoPage() {
  const { addresses, addAddress, setActive, remove } = useAddresses()
  const [pendingAddress, setPendingAddress] = useState<Address | null>(null)
  const [labelKind, setLabelKind] = useState<LabelKind>("hem")
  const [customLabelText, setCustomLabelText] = useState("")
  const [resetToken, setResetToken] = useState(0)
  const [saveError, setSaveError] = useState("")
  const [listError, setListError] = useState("")
  const [pendingRemoval, setPendingRemoval] = useState<{
    address: SavedAddress
    trigger: HTMLButtonElement
  } | null>(null)
  const focusRestoreIndexRef = useRef<number | null>(null)
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>())

  function handleResolved(address: Address) {
    setPendingAddress(address)
    setSaveError("")
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingAddress) return
    const label: AddressLabel =
      labelKind === "annan" ? { kind: "annan", text: customLabelText.trim() } : { kind: labelKind }
    if (label.kind === "annan" && !label.text) return

    try {
      await addAddress(pendingAddress, label)
      setPendingAddress(null)
      setLabelKind("hem")
      setCustomLabelText("")
      setResetToken((token) => token + 1)
    } catch {
      setSaveError("Det gick inte att spara adressen. Försök igen.")
    }
  }

  async function handleSetActive(id: string) {
    setListError("")
    try {
      await setActive(id)
    } catch {
      setListError("Det gick inte att ändra aktuell plats. Försök igen.")
    }
  }

  async function handleRemove(id: string, trigger: HTMLButtonElement) {
    setListError("")
    const index = addresses.findIndex((candidate) => candidate.id === id)
    try {
      await remove(id)
      focusRestoreIndexRef.current = index
    } catch {
      setListError("Det gick inte att ta bort adressen. Försök igen.")
      if (trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }

  useEffect(() => {
    const index = focusRestoreIndexRef.current
    if (index === null) return
    focusRestoreIndexRef.current = null
    const next = addresses[Math.min(index, addresses.length - 1)]
    const target = next ? removeButtonRefs.current.get(next.id) : null
    ;(target ?? document.getElementById("page-heading"))?.focus({ preventScroll: true })
  }, [addresses])

  return (
    <section>
      <h1 id="page-heading" tabIndex={-1} className="text-3xl font-bold text-blue-900">
        Min info
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-slate-700">
        Spara en eller flera adresser, till exempel ditt hem och din arbetsplats. Markera vilken som
        är din aktuella plats — den används som utgångspunkt när appen senare hjälper dig hitta
        närliggande skyddsrum.
      </p>

      {addresses.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col gap-2 rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {describeAddressLabel(address.label)}
                </p>
                <p className="text-base text-slate-900">{address.text}</p>
                <p className="text-sm text-slate-600">
                  {address.source === "manual"
                    ? "Angiven manuellt"
                    : "Hämtad automatiskt – ungefärlig"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {address.isActive ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-green-800">
                    <span aria-hidden="true">✓</span> Aktuell plats
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetActive(address.id)}
                    className="min-h-12 min-w-12 rounded-xl border-2 border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
                  >
                    Ange som aktuell plats
                  </button>
                )}
                <button
                  type="button"
                  ref={(element) => {
                    if (element) removeButtonRefs.current.set(address.id, element)
                    else removeButtonRefs.current.delete(address.id)
                  }}
                  onClick={(event) => setPendingRemoval({ address, trigger: event.currentTarget })}
                  className="min-h-12 min-w-12 rounded-xl border-2 border-red-800 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
                >
                  Ta bort
                  <span className="sr-only">
                    : {describeAddressLabel(address.label)}, {address.text}
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div role="alert" className="mt-2 text-sm font-medium text-red-800">
        {listError}
      </div>

      <AddressSection key={resetToken} onResolved={handleResolved} />

      {pendingAddress && (
        <form
          onSubmit={handleSave}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-slate-700">
              Vad är det här för plats?
            </legend>
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
                  onChange={() => setLabelKind(kind)}
                  className="h-5 w-5"
                />
                {kind === "hem" ? "Hem" : kind === "arbete" ? "Arbete" : "Annan"}
              </label>
            ))}
            {labelKind === "annan" && (
              <input
                type="text"
                required
                placeholder="T.ex. Sommarstuga"
                aria-label="Egen etikett"
                value={customLabelText}
                onChange={(event) => setCustomLabelText(event.target.value)}
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
      )}

      {pendingRemoval && (
        <RemoveAddressDialog
          key={pendingRemoval.address.id}
          address={pendingRemoval.address}
          onCancel={() => {
            const { trigger } = pendingRemoval
            setPendingRemoval(null)
            if (trigger.isConnected) trigger.focus({ preventScroll: true })
          }}
          onConfirm={() => {
            const { address, trigger } = pendingRemoval
            setPendingRemoval(null)
            void handleRemove(address.id, trigger)
          }}
        />
      )}
    </section>
  )
}

export default MyInfoPage
