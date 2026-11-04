import { expect, test, type Locator, type Page } from "@playwright/test"

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, "element should be rendered").not.toBeNull()
  return box!
}

/** Bottom edge of the VMA status notice, or 0 when no notice is shown. */
async function vmaBottom(page: Page): Promise<number> {
  const notice = page.getByRole("complementary", { name: "VMA-status" })
  if ((await notice.count()) === 0 || !(await notice.isVisible())) return 0
  const box = await boxOf(notice)
  return box.y + box.height
}

/** Opens a long page and scrolls to its end, waiting until the page has actually scrolled. */
async function openScrolledPhoneNumbers(page: Page) {
  await page.goto("/telefonnummer")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
}

test.beforeEach(async ({ page }) => {
  // No backend runs during E2E; failing API calls fast keeps the VMA banner deterministic.
  await page.route("**/api/v1/**", (route) => route.abort())
})

test.describe("desktop navigation at 1024px", () => {
  test.use({ viewport: { width: 1024, height: 700 } })

  test("stays pinned directly below the VMA notice while the header scrolls away", async ({
    page,
  }) => {
    await openScrolledPhoneNumbers(page)

    const navigation = page.getByRole("navigation", { name: "Huvudnavigation" })
    const navigationBox = await boxOf(navigation)
    expect(navigationBox.y).toBeCloseTo(await vmaBottom(page), 0)

    const header = await boxOf(page.getByRole("banner"))
    expect(header.y + header.height).toBeLessThanOrEqual(navigationBox.y)

    const current = navigation.getByRole("link", { name: "Krisinformation" })
    await expect(current).toHaveAttribute("aria-current", "page")
  })

  test("moves a focused link out from behind the pinned navigation", async ({ page }) => {
    await openScrolledPhoneNumbers(page)

    const navigation = page.getByRole("navigation", { name: "Huvudnavigation" })
    const navigationBox = await boxOf(navigation)
    // A link mid-page keeps the navigation pinned while the link sits behind it.
    const links = page.getByRole("main").getByRole("link")
    const link = links.nth(Math.floor((await links.count()) / 2))

    // The browser does not scroll on focus when the link is already within the viewport, so a
    // link covered by the navigation is the case the scroll offset has to handle.
    await link.evaluate((element, coveredTop) => {
      window.scrollBy(0, element.getBoundingClientRect().top - coveredTop)
    }, navigationBox.y + 10)
    const covered = await boxOf(link)
    expect(covered.y).toBeLessThan(navigationBox.y + navigationBox.height)
    expect(covered.y).toBeGreaterThan(navigationBox.y)

    await link.focus()

    await expect
      .poll(async () => {
        const linkBox = await boxOf(link)
        const pinned = await boxOf(navigation)
        return linkBox.y - (pinned.y + pinned.height)
      })
      .toBeGreaterThanOrEqual(0)
  })
})

test.describe("mobile navigation at 375px", () => {
  test.use({ viewport: { width: 375, height: 700 } })

  test("keeps only the fixed bottom menu bar", async ({ page }) => {
    await openScrolledPhoneNumbers(page)

    await expect(page.getByRole("navigation", { name: "Huvudnavigation" })).toBeHidden()
    const footer = await boxOf(page.getByRole("navigation", { name: "Huvudmeny" }))
    expect(footer.y + footer.height).toBeCloseTo(700, 0)
  })
})
