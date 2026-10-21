// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useInstallPrompt } from "../hooks/useInstallPrompt"
import InstallAppButton from "./InstallAppButton"

vi.mock("../hooks/useInstallPrompt", () => ({ useInstallPrompt: vi.fn() }))

function mountButton(canInstall: boolean, afterPrompt?: () => void) {
  const promptInstall = vi.fn().mockResolvedValue("accepted")
  vi.mocked(useInstallPrompt).mockReturnValue({ canInstall, promptInstall })
  const view = render(
    <>
      <InstallAppButton afterPrompt={afterPrompt} />
      <h1 id="page-heading" tabIndex={-1}>
        Hem
      </h1>
    </>
  )
  return { ...view, promptInstall }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("InstallAppButton", () => {
  it("renders nothing when installation cannot be offered", () => {
    const { container } = mountButton(false)

    expect(screen.queryByRole("button")).toBe(null)
    expect(container.childElementCount).toBe(1)
  })

  it("is a native button named by its visible text", () => {
    mountButton(true)

    const button = screen.getByRole("button", { name: "Installera app" })
    expect(button.tagName).toBe("BUTTON")
    expect(button.getAttribute("type")).toBe("button")
    expect(button.hasAttribute("aria-label")).toBe(false)
  })

  it("opens the install prompt and moves focus to the page heading", () => {
    const { promptInstall } = mountButton(true)
    const button = screen.getByRole("button", { name: "Installera app" })
    button.focus()

    fireEvent.click(button)

    expect(promptInstall).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Hem" }))
  })

  it("opens the prompt before a supplied focus handler runs, leaving focus to that handler", () => {
    const calls: string[] = []
    const afterPrompt = vi.fn(() => calls.push("afterPrompt"))
    const { promptInstall } = mountButton(true, afterPrompt)
    promptInstall.mockImplementation(() => {
      calls.push("prompt")
      return Promise.resolve("accepted")
    })
    const button = screen.getByRole("button", { name: "Installera app" })
    button.focus()

    fireEvent.click(button)

    expect(calls).toEqual(["prompt", "afterPrompt"])
    expect(document.activeElement).toBe(button)
  })
})
