// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"
import NotFoundPage from "./NotFoundPage"

afterEach(cleanup)

describe("NotFoundPage", () => {
  it("has one focusable page heading", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    const h1s = screen.getAllByRole("heading", { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0].id).toBe("page-heading")
  })

  it("links to the start page and the krisinfo overview", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/krisinformation",
    ])
  })
})
