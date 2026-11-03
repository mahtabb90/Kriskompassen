import { expect, test, type Page } from "@playwright/test"

/** Resolves after two animation frames, once the layout's rAF-deferred focus check has run. */
async function afterNextFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
}

test.beforeEach(async ({ page }) => {
  // No backend runs during E2E; failing API calls fast keeps the VMA banner deterministic.
  await page.route("**/api/v1/**", (route) => route.abort())
  await page.goto("/crisis-kit")
  await expect(page.getByRole("heading", { level: 1, name: "Min krislåda" })).toBeVisible()
})

test.describe("Min krislåda on a desktop viewport", () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test("clicking a card's text keeps the scroll position", async ({ page }) => {
    await page.getByRole("heading", { level: 2, name: "Mat", exact: true }).click()
    const cardHeading = page.getByRole("heading", { level: 4, name: "Salt och kryddor" })
    await expect(cardHeading).toBeVisible()

    // Place the card mid-screen so the top of main is far above the viewport.
    await cardHeading.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" })
    )
    await afterNextFrames(page)
    const scrollBefore = await page.evaluate(() => window.scrollY)
    expect(scrollBefore).toBeGreaterThan(300)

    // Non-interactive card text: the click moves focus to the focusable main landmark, the path
    // that used to scroll main's top edge into view.
    await cardHeading.click()
    await afterNextFrames(page)

    await expect(page.getByRole("main")).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  })
})

test("a custom item shows save feedback and remains after a reload", async ({ page }) => {
  await page.getByLabel("Namn").fill("E2E-testsak")
  await page.getByRole("button", { name: "Lägg till sak" }).click()

  // The layout has other status regions (VMA, connectivity, app update), so match this one's text.
  await expect(
    page.getByRole("status").filter({ hasText: "Saken har lagts till i din krislåda." })
  ).toBeVisible()

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "Min krislåda" })).toBeVisible()
  await page.getByRole("heading", { level: 2, name: "Övrigt", exact: true }).click()

  await expect(page.getByRole("heading", { level: 4, name: "E2E-testsak" })).toBeVisible()
})
