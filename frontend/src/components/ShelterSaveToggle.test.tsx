// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import ShelterSaveToggle from "./ShelterSaveToggle"

afterEach(() => {
  cleanup()
})

describe("ShelterSaveToggle when unsaved", () => {
  it("shows an unsaved status and a save action, and calls onToggle on click", () => {
    const onToggle = vi.fn()
    render(<ShelterSaveToggle saved={false} onToggle={onToggle} />)

    expect(screen.getByText("Inte sparat", { ignore: '[aria-hidden="true"]' })).toBeTruthy()
    const button = screen.getByRole("button", { name: "Spara skyddsrum" })
    expect(screen.queryByRole("button", { name: "Ta bort sparat skyddsrum" })).toBeNull()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe("ShelterSaveToggle when saved", () => {
  it("shows a saved status and a remove action, and calls onToggle on click", () => {
    const onToggle = vi.fn()
    render(<ShelterSaveToggle saved={true} onToggle={onToggle} />)

    expect(screen.getByText("Sparat skyddsrum", { ignore: '[aria-hidden="true"]' })).toBeTruthy()
    const button = screen.getByRole("button", { name: "Ta bort sparat skyddsrum" })
    expect(screen.queryByRole("button", { name: "Spara skyddsrum" })).toBeNull()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe("ShelterSaveToggle map image removal warning", () => {
  it("shows a warning that the saved map image is removed too, only when saved and hasMapImage", () => {
    render(<ShelterSaveToggle saved={true} onToggle={vi.fn()} hasMapImage={true} />)

    expect(screen.getByText("Den sparade kartbilden tas också bort.")).toBeTruthy()
  })

  it("hides the warning when there is no saved image", () => {
    render(<ShelterSaveToggle saved={true} onToggle={vi.fn()} hasMapImage={false} />)

    expect(screen.queryByText("Den sparade kartbilden tas också bort.")).toBeNull()
  })

  it("hides the warning when unsaved, even if hasMapImage is somehow true", () => {
    render(<ShelterSaveToggle saved={false} onToggle={vi.fn()} hasMapImage={true} />)

    expect(screen.queryByText("Den sparade kartbilden tas också bort.")).toBeNull()
  })
})

describe("ShelterSaveToggle actions slot", () => {
  it.each([false, true])("puts the detail link before the toggle when saved=%s", (saved) => {
    render(
      <ShelterSaveToggle
        saved={saved}
        onToggle={vi.fn()}
        actions={<a href="/x">Visa detaljer</a>}
      />
    )

    const detailsLink = screen.getByRole("link", { name: "Visa detaljer" })
    const toggle = screen.getByRole("button", {
      name: saved ? "Ta bort sparat skyddsrum" : "Spara skyddsrum",
    })
    expect(detailsLink.parentElement).toBe(toggle.parentElement)
    expect(
      detailsLink.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
