// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import CrisisKitItem from "./CrisisKitItem"
import type { CrisisKitItem as CrisisKitItemType } from "../types/crisisKit"

afterEach(() => {
  cleanup()
})

const baseItem: CrisisKitItemType = {
  id: "test-item",
  name: "Konserver",
  category: "Mat",
  isOwned: true,
  isCustom: false,
}

describe("CrisisKitItem expiration dates", () => {
  it("shows a warning when the expiration date has passed", () => {
    render(<CrisisKitItem item={{ ...baseItem, expirationDate: "2020-01-01" }} />)

    expect(screen.getByText("Utgångsdatumet har passerat.")).toBeTruthy()
    expect(screen.getByText("2020-01-01")).toBeTruthy()
  })

  it("does not show a warning for a future expiration date", () => {
    render(<CrisisKitItem item={{ ...baseItem, expirationDate: "2099-12-31" }} />)

    expect(screen.queryByText("Utgångsdatumet har passerat.")).toBeNull()
    expect(screen.getByText("2099-12-31")).toBeTruthy()
  })

  it("does not show a date or warning when the expiration date is missing", () => {
    render(<CrisisKitItem item={baseItem} />)

    expect(screen.queryByText("Utgångsdatum:", { exact: true })).toBeNull()
    expect(screen.queryByText("Utgångsdatumet har passerat.")).toBeNull()
  })
})
