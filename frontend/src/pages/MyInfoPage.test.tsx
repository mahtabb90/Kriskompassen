// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { installDialogTestMethods } from "../components/__fixtures__/dialog"
import { AddressProvider } from "../context/AddressProvider"
import {
  getSavedAddresses,
  removeAddress,
  saveAddress,
  setActiveAddress,
} from "../services/addressStorageService"
import type { SavedAddress } from "../types/address"
import MyInfoPage from "./MyInfoPage"

vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn(),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

const home: SavedAddress = {
  id: "1",
  text: "Hemgatan 1",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-13T00:00:00.000Z",
}
const work: SavedAddress = {
  ...home,
  id: "2",
  text: "Jobbgatan 2",
  label: { kind: "arbete" },
  isActive: false,
}

let restoreDialog: () => void

beforeEach(() => {
  restoreDialog = installDialogTestMethods()
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn() } })
  vi.mocked(getSavedAddresses).mockResolvedValue([])
  vi.mocked(setActiveAddress).mockResolvedValue(undefined)
  vi.mocked(removeAddress).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  restoreDialog()
  document.documentElement.style.removeProperty("overflow")
  document.body.style.removeProperty("overflow")
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function mount() {
  return render(
    <AddressProvider>
      <MyInfoPage />
    </AddressProvider>
  )
}

describe("MyInfoPage", () => {
  it("lists saved addresses with their label and marks the active one", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home, work])
    mount()

    expect(await screen.findByText("Hemgatan 1")).toBeTruthy()
    expect(screen.getByText("Jobbgatan 2")).toBeTruthy()
    expect(screen.getByText("Aktuell plats")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Ange som aktuell plats" })).toBeTruthy()
  })

  it("activates a non-active saved address", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home, work])
    mount()
    await screen.findByText("Jobbgatan 2")

    fireEvent.click(screen.getByRole("button", { name: "Ange som aktuell plats" }))

    await waitFor(() => expect(setActiveAddress).toHaveBeenCalledWith("2"))
  })

  it("shows a confirmation dialog naming the address before removing it", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    mount()
    await screen.findByText("Hemgatan 1")

    fireEvent.click(screen.getByRole("button", { name: /Ta bort/ }))
    const dialog = screen.getByRole("dialog")
    expect(dialog.textContent).toContain("Hem")
    expect(dialog.textContent).toContain("Hemgatan 1")
    expect(removeAddress).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole("button", { name: "Ta bort" }))

    await waitFor(() => expect(removeAddress).toHaveBeenCalledWith("1"))
  })

  it("cancelling the confirmation dialog leaves the address unchanged", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    mount()
    await screen.findByText("Hemgatan 1")

    fireEvent.click(screen.getByRole("button", { name: /Ta bort/ }))
    const dialog = screen.getByRole("dialog")

    fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }))

    expect(removeAddress).not.toHaveBeenCalled()
    expect(screen.getByText("Hemgatan 1")).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows an error and keeps the address when removal fails", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([home])
    vi.mocked(removeAddress).mockRejectedValue(new Error("storage error"))
    mount()
    await screen.findByText("Hemgatan 1")

    fireEvent.click(screen.getByRole("button", { name: /Ta bort/ }))
    const dialog = screen.getByRole("dialog")
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Ta bort" }))
    })

    expect(await screen.findByText("Det gick inte att ta bort adressen. Försök igen.")).toBeTruthy()
    expect(screen.getByText("Hemgatan 1")).toBeTruthy()
  })

  it("saves a newly resolved address with a fixed label", async () => {
    mount()
    await waitFor(() => expect(getSavedAddresses).toHaveBeenCalled())
    const saved = { ...work, id: "3" }
    vi.mocked(saveAddress).mockResolvedValue(saved)
    vi.mocked(getSavedAddresses).mockResolvedValue([saved])

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Jobbgatan 2" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))

    fireEvent.click(screen.getByRole("radio", { name: "Arbete" }))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Spara adress" }))
    })

    expect(saveAddress).toHaveBeenCalledWith(
      { text: "Jobbgatan 2", source: "manual", approximate: false },
      { kind: "arbete" }
    )
    // The add form resets (AddressSection remounts) once the save completes.
    expect(screen.queryByText("Jobbgatan 2", { selector: "p.text-base" })).toBeTruthy()
  })

  it("requires custom text before saving a address labelled 'annan'", async () => {
    mount()
    await waitFor(() => expect(getSavedAddresses).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Sommarstuga 3" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))
    fireEvent.click(screen.getByRole("radio", { name: "Annan" }))

    const customLabelInput = screen.getByLabelText("Egen etikett")
    fireEvent.click(screen.getByRole("button", { name: "Spara adress" }))
    expect(saveAddress).not.toHaveBeenCalled()

    fireEvent.change(customLabelInput, { target: { value: "Sommarstuga" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Spara adress" }))
    })

    expect(saveAddress).toHaveBeenCalledWith(
      { text: "Sommarstuga 3", source: "manual", approximate: false },
      { kind: "annan", text: "Sommarstuga" }
    )
  })
})
