// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import AddressSection from "./AddressSection"

function makePositionError(code: 1 | 2 | 3): GeolocationPositionError {
  return {
    code,
    message: "error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError
}

const getCurrentPosition = vi.fn()
let fetchMock = vi.fn<typeof fetch>()

function baseProps() {
  return {
    labelKind: "hem" as const,
    customLabelText: "",
    onLabelKindChange: vi.fn(),
    onCustomLabelTextChange: vi.fn(),
    onSave: vi.fn(),
    saveError: "",
  }
}

beforeEach(() => {
  getCurrentPosition.mockReset()
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("AddressSection", () => {
  it("confirms a manually typed address, labels it as manual and reports it resolved", () => {
    const onResolved = vi.fn()
    render(<AddressSection onResolved={onResolved} {...baseProps()} />)

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Testgatan 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))

    expect(screen.getByText("Testgatan 1")).toBeTruthy()
    expect(screen.getByText("Angiven manuellt")).toBeTruthy()
    expect(onResolved).toHaveBeenCalledExactlyOnceWith({
      text: "Testgatan 1",
      source: "manual",
      approximate: false,
    })
  })

  it("fetches and labels an automatically retrieved address as approximate", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 59.3, longitude: 18.0, accuracy: 30 },
      } as GeolocationPosition)
    })
    fetchMock.mockResolvedValue(
      Response.json({ found: true, address: "Drottninggatan 1", lat: 59.3, lon: 18.0 })
    )

    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Hämta min position" }))
    })

    expect(screen.getByText("Drottninggatan 1")).toBeTruthy()
    expect(screen.getByText(/ungefärlig position/)).toBeTruthy()
    expect(screen.getByText(/OpenStreetMap/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Hämta ny position" })).toBeTruthy()
  })

  it("flags a particularly imprecise fix instead of the generic approximate message", async () => {
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess({
        coords: { latitude: 59.3, longitude: 18.0, accuracy: 18_000 },
      } as GeolocationPosition)
    })
    fetchMock.mockResolvedValue(
      Response.json({ found: true, address: "Drottninggatan 1", lat: 59.3, lon: 18.0 })
    )

    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Hämta min position" }))
    })

    expect(screen.getByText(/mycket osäker/)).toBeTruthy()
    expect(screen.getByText(/±18\.0 km/)).toBeTruthy()
    expect(screen.queryByText(/ungefärlig position/)).toBeNull()
  })

  it("shows an accessible error for a denied permission while manual entry stays usable", async () => {
    getCurrentPosition.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) => {
        onError(makePositionError(1))
      }
    )

    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Hämta min position" }))
    })

    expect(screen.getByRole("alert").textContent).toContain("nekades")
    const input = screen.getByLabelText("Adress") as HTMLInputElement
    expect(input.disabled).toBe(false)
    fireEvent.change(input, { target: { value: "Testgatan 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))
    expect(screen.getByText("Testgatan 1")).toBeTruthy()
  })

  it("disables the location button with an explanation when geolocation is unsupported", () => {
    vi.stubGlobal("navigator", {})
    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)

    const button = screen.getByRole("button", { name: "Hämta min position" }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(/stöder inte platshämtning/)).toBeTruthy()
  })

  it("refills and focuses the input with the current address when editing", () => {
    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Testgatan 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))
    fireEvent.click(screen.getByRole("button", { name: "Ändra adress" }))

    const input = screen.getByLabelText("Adress") as HTMLInputElement
    expect(input.value).toBe("Testgatan 1")
    expect(document.activeElement).toBe(input)
  })

  it("keeps the label picker and save button in the same preview card as the address actions", () => {
    render(<AddressSection onResolved={vi.fn()} {...baseProps()} />)

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Testgatan 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))

    const previewCard = screen.getByRole("status")
    expect(within(previewCard).getByRole("button", { name: "Ändra adress" })).toBeTruthy()
    expect(within(previewCard).getByText("Vad är det här för plats?")).toBeTruthy()
    expect(within(previewCard).getByRole("radio", { name: "Hem" })).toBeTruthy()
    expect(within(previewCard).getByRole("button", { name: "Spara adress" })).toBeTruthy()
  })

  it("reports a label change and submits via onSave when saving", () => {
    const onLabelKindChange = vi.fn()
    const onSave = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    render(
      <AddressSection
        onResolved={vi.fn()}
        {...baseProps()}
        onLabelKindChange={onLabelKindChange}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText("Adress"), { target: { value: "Testgatan 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Bekräfta adress" }))

    fireEvent.click(screen.getByRole("radio", { name: "Arbete" }))
    expect(onLabelKindChange).toHaveBeenCalledExactlyOnceWith("arbete")

    fireEvent.click(screen.getByRole("button", { name: "Spara adress" }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
