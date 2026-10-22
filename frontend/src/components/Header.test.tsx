// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressProvider } from "../context/AddressProvider"
import { ModeProvider } from "../context/ModeProvider"
import { getSavedAddresses } from "../services/addressStorageService"
import { installPromptEvent } from "../services/__fixtures__/installPrompt"
import { installPromptService } from "../services/installPromptService"
import type { SavedAddress } from "../types/address"
import Header from "./Header"

// jsdom does not implement IndexedDB, so the address boundary is stubbed.
vi.mock("../services/addressStorageService", () => ({
  getSavedAddresses: vi.fn(),
  saveAddress: vi.fn(),
  setActiveAddress: vi.fn(),
  removeAddress: vi.fn(),
}))

const activeAddress: SavedAddress = {
  id: "1",
  text: "Storgatan 1",
  source: "manual",
  approximate: false,
  label: { kind: "hem" },
  isActive: true,
  savedAt: "2026-10-21T00:00:00.000Z",
}

function mountHeader() {
  return render(
    <ModeProvider>
      <AddressProvider>
        <MemoryRouter>
          <Header />
          <h1 id="page-heading" tabIndex={-1}>
            Hem
          </h1>
        </MemoryRouter>
      </AddressProvider>
    </ModeProvider>
  )
}

function offerInstall() {
  installPromptService.start()
  const event = installPromptEvent()
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  vi.mocked(getSavedAddresses).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  installPromptService.dispose()
  vi.restoreAllMocks()
})

describe("Header install button", () => {
  it("is absent while the browser offers no installation", () => {
    mountHeader()
    expect(screen.queryByRole("button", { name: "Installera app" })).toBe(null)
  })

  it("follows connectivity status before the mode switch and active address", async () => {
    vi.mocked(getSavedAddresses).mockResolvedValue([activeAddress])
    offerInstall()
    mountHeader()
    const address = await screen.findByRole("link", { name: "Storgatan 1" })
    const install = screen.getByRole("button", { name: "Installera app" })
    const modeSwitch = screen.getByRole("switch", { name: "Sparad information" })
    const status = screen.getByRole("status")

    expect(status.textContent).toBe("Ansluten")
    expect(status.compareDocumentPosition(install) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(install.compareDocumentPosition(modeSwitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(modeSwitch.compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it("uses the discreet text variant with its decorative icon", () => {
    offerInstall()
    mountHeader()
    const install = screen.getByRole("button", { name: "Installera app" })
    expect(install.querySelector("svg[aria-hidden='true']")).not.toBe(null)
  })

  it("prompts, disappears and moves focus to the page heading", async () => {
    const event = offerInstall()
    mountHeader()
    await waitFor(() => expect(getSavedAddresses).toHaveBeenCalled())
    const install = screen.getByRole("button", { name: "Installera app" })
    install.focus()

    fireEvent.click(install)

    expect(event.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole("button", { name: "Installera app" })).toBe(null)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
  })
})
