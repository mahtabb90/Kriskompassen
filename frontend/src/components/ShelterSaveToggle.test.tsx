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

    expect(screen.getByText("Inte sparat")).toBeTruthy()
    const button = screen.getByRole("button", { name: "Spara skyddsrum" })
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe("ShelterSaveToggle when saved", () => {
  it("shows a saved status and a remove action, and calls onToggle on click", () => {
    const onToggle = vi.fn()
    render(<ShelterSaveToggle saved={true} onToggle={onToggle} />)

    expect(screen.getByText("Sparat skyddsrum")).toBeTruthy()
    const button = screen.getByRole("button", { name: "Ta bort sparat skyddsrum" })
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe("ShelterSaveToggle actions slot", () => {
  it("renders extra actions in the same row as the button", () => {
    render(
      <ShelterSaveToggle
        saved={false}
        onToggle={vi.fn()}
        actions={<a href="/x">Visa detaljer</a>}
      />
    )

    expect(screen.getByRole("link", { name: "Visa detaljer" })).toBeTruthy()
  })
})
