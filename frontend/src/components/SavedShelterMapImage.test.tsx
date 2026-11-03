// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import SavedShelterMapImage from "./SavedShelterMapImage"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SavedShelterMapImage", () => {
  it("renders the blob as an object URL with the given alt text", () => {
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" })
    render(<SavedShelterMapImage image={image} alt="Sparad vy av kartan" />)

    const img = screen.getByRole("img", { name: "Sparad vy av kartan" }) as HTMLImageElement
    expect(img.src).toMatch(/^blob:/)
  })

  it("revokes the object URL on unmount", () => {
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL")
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" })
    const { unmount } = render(<SavedShelterMapImage image={image} alt="Sparad vy av kartan" />)

    const img = screen.getByRole("img") as HTMLImageElement
    const url = img.src
    unmount()

    expect(revokeSpy).toHaveBeenCalledWith(url)
  })
})
