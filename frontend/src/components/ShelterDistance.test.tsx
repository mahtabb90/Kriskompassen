// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import ShelterDistance from "./ShelterDistance"

afterEach(() => {
  cleanup()
})

describe("ShelterDistance", () => {
  it("shows the abbreviated distance with a crow-flies qualifier, hidden from screen readers", () => {
    render(<ShelterDistance meters={350} />)
    const visible = screen.getByText("350 m (fågelvägen)")
    expect(visible.getAttribute("aria-hidden")).toBe("true")
  })

  it("exposes a spelled-out unit and qualifier to screen readers", () => {
    render(<ShelterDistance meters={350} />)
    expect(screen.getByText("350 meter fågelvägen")).toBeTruthy()
  })

  it("formats kilometer distances the same way in both variants", () => {
    render(<ShelterDistance meters={1500} />)
    expect(screen.getByText("1,5 km (fågelvägen)")).toBeTruthy()
    expect(screen.getByText("1,5 kilometer fågelvägen")).toBeTruthy()
  })
})
