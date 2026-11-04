import { expect, test, type Locator, type Page } from "@playwright/test"

// Synthetic content exercises different wrapping without relying on a running backend.
const articles = [
  {
    id: "food-in-crisis",
    title: "Mat",
    description: "Korta råd för en kris.",
    content: "Här finns råd om mat vid en kris.",
    source: "Testkälla",
    fetchedAt: "2026-11-04T12:00:00.000Z",
  },
  {
    id: "drinking-water-in-crisis",
    title: "Mat och råd för dig och för dem du bor med vid en kris",
    description: "Planera hur du kan få tag på mer vatten om vattenförsörjningen avbryts.",
    content: "Planera hur du kan få tag på mat och rent vatten vid en kris.",
    source: "Testkälla",
    fetchedAt: "2026-11-04T12:00:00.000Z",
  },
  // A third card creates another row at desktop widths, exposing row-by-row height differences.
  {
    id: "hygiene-in-crisis",
    title: "Toalett och hygien",
    description: "Råd om hygien.",
    content: "Planera hur du kan sköta din hygien vid en kris.",
    source: "Testkälla",
    fetchedAt: "2026-11-04T12:00:00.000Z",
  },
  {
    id: "communication-in-crisis",
    title: "Kommunikation",
    description: "Planera hur du kan få viktig information vid en kris.",
    content: "Planera hur du håller kontakt med andra.",
    source: "Testkälla",
    fetchedAt: "2026-11-04T12:00:00.000Z",
  },
]
const confirmationNames = ["Mat", "Mat och...", "Toalett...", "Kommuni..."]

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box, "element should be rendered").not.toBeNull()
  return box!
}

/** Measures controls relative to their card, independently of scrolling during clicks. */
async function measurePanel(panel: Locator, controls: Locator[]) {
  const panelBox = await boxOf(panel)
  const boxes = await Promise.all(controls.map(boxOf))
  return {
    height: panelBox.height,
    controls: boxes.map((box) => ({
      x: box.x - panelBox.x,
      y: box.y - panelBox.y,
      width: box.width,
      height: box.height,
    })),
  }
}

async function expectEqualCardHeights(cards: Locator[]) {
  const heights = await Promise.all(cards.map(async (card) => (await boxOf(card)).height))
  expect(
    Math.max(...heights) - Math.min(...heights),
    "all cards across all rows"
  ).toBeLessThanOrEqual(1)
}

/** Checks actual text bounds and the room required by the universal 3px/4px focus outline. */
async function expectCardReflow(panel: Locator, controls: Locator[]) {
  const issues: string[] = []
  const bounds = await boxOf(panel)
  for (const control of controls) {
    const box = await boxOf(control)
    const row = await control.locator("..").boundingBox()
    expect(row, "the control's action row should be rendered").not.toBeNull()
    if (box.x < row!.x - 1 || box.x + box.width > row!.x + row!.width + 1) {
      issues.push(`control outside action row: ${JSON.stringify({ row, control: box })}`)
    }
    if (
      box.x - 7 < bounds.x ||
      box.x + box.width + 7 > bounds.x + bounds.width ||
      box.y - 7 < bounds.y ||
      box.y + box.height + 7 > bounds.y + bounds.height
    ) {
      issues.push(`control/focus outside card: ${JSON.stringify({ card: bounds, control: box })}`)
    }
    expect(box.width).toBeGreaterThanOrEqual(48)
    expect(box.height).toBeGreaterThanOrEqual(48)
  }
  const textIssues = await panel.locator("h1, h2, p").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      return text.left < box.left - 1 || text.right > box.right + 1
        ? [`text outside its column: ${element.textContent}`]
        : []
    })
  )
  expect([...issues, ...textIssues]).toEqual([])
}

function expectUnchanged(
  before: Awaited<ReturnType<typeof measurePanel>>,
  after: Awaited<ReturnType<typeof measurePanel>>
) {
  expect(Math.abs(after.height - before.height), "card height").toBeLessThanOrEqual(1)
  expect(after.controls).toHaveLength(before.controls.length)
  for (const [index, box] of after.controls.entries()) {
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(
        Math.abs(box[key] - before.controls[index][key]),
        `control ${index} ${key}`
      ).toBeLessThanOrEqual(1)
    }
  }
}

/** Visibility alone also accepts sr-only content, so verify unclipped text and card bounds. */
async function expectFullConfirmation(panel: Locator, controls: Locator[], message: string) {
  const status = panel.getByRole("status")
  await expect(status).toHaveText(message)
  await expect(status).toBeVisible()
  await expect(status).not.toHaveClass(/\bsr-only\b/)
  expect(
    await status.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        horizontalClipping: element.scrollWidth > element.clientWidth + 1,
        verticalClipping: element.scrollHeight > element.clientHeight + 1,
        clip: style.clip,
        visibility: style.visibility,
      }
    })
  ).toEqual({
    horizontalClipping: false,
    verticalClipping: false,
    clip: "auto",
    visibility: "visible",
  })

  const panelBox = await boxOf(panel)
  const statusBox = await boxOf(status)
  const controlBoxes = await Promise.all(controls.map(boxOf))
  expect(statusBox.y).toBeGreaterThanOrEqual(
    Math.max(...controlBoxes.map((box) => box.y + box.height))
  )
  expect(statusBox.x).toBeGreaterThanOrEqual(panelBox.x)
  expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1)
  expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height + 1)

  const spacing = await status.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const statusBottom = element.getBoundingClientRect().bottom
    const card = element.closest(".group")
    const footer = card?.lastElementChild
    return {
      belowText: statusBottom - range.getBoundingClientRect().bottom,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
      footerGap: card ? card.getBoundingClientRect().bottom - statusBottom : null,
      footerPadding:
        card && footer
          ? Number.parseFloat(getComputedStyle(footer).paddingBottom) +
            Number.parseFloat(getComputedStyle(card).borderBottomWidth)
          : null,
    }
  })
  // Allow normal font leading, but no unused reserved line or empty-alert gap below the text.
  expect(spacing.belowText).toBeLessThanOrEqual(spacing.lineHeight / 2 + 1)
  if (spacing.footerGap !== null && spacing.footerPadding !== null) {
    expect(spacing.footerGap).toBeLessThanOrEqual(spacing.footerPadding + 1)
  }
}

async function checkSaveAndRemove(
  panel: Locator,
  controls: Locator[],
  title: string,
  confirmationName: string
) {
  const button = controls[controls.length - 1]
  await expect(button).toBeEnabled()
  await expect(button).toHaveAccessibleName(new RegExp(`^Spara offline\\s*:\\s*${title}$`))
  await expect(panel.getByRole("status")).toBeEmpty()
  await expectCardReflow(panel, controls)
  const before = await measurePanel(panel, controls)

  await button.click()

  await expectFullConfirmation(
    panel,
    controls,
    `"${confirmationName}" har sparats för offlineåtkomst.`
  )
  await expect(button).toHaveAccessibleName(new RegExp(`^Ta bort offlinekopia\\s*:\\s*${title}$`))
  await expectCardReflow(panel, controls)
  expectUnchanged(before, await measurePanel(panel, controls))

  await button.click()

  await expectFullConfirmation(
    panel,
    controls,
    `"${confirmationName}" har tagits bort från offlinelagringen.`
  )
  await expect(button).toHaveAccessibleName(new RegExp(`^Spara offline\\s*:\\s*${title}$`))
  await expectCardReflow(panel, controls)
  expectUnchanged(before, await measurePanel(panel, controls))
}

async function openPage(page: Page, path: string, textPercent = 100, reservedScrollbar = false) {
  await page.goto(path)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  if (textPercent !== 100) {
    await page.addStyleTag({ content: `html { font-size: ${textPercent}% }` })
  }
  if (reservedScrollbar) {
    // Reserve classic-scrollbar space even on macOS, whose native overlay uses no layout width.
    // Hide the native scrollbar so Linux/Windows do not reserve the same space twice.
    await page.addStyleTag({
      content: "html { scrollbar-gutter: auto; scrollbar-width: none; padding-right: 15px }",
    })
    expect(
      await page.evaluate(() => innerWidth - document.body.getBoundingClientRect().width)
    ).toBe(15)
  }
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => document.fonts.ready)
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === "/api/v1/crisis") return route.fulfill({ json: articles })
    const article = articles.find((item) => pathname === `/api/v1/crisis/${item.id}`)
    if (article) return route.fulfill({ json: article })
    return route.abort()
  })
})

const scenarios = [
  ...[320, 360, 375, 390, 414, 480, 639, 640, 700, 767, 768, 820, 1024, 1280, 1440, 1920].map(
    (width) => ({ width, height: 900, textPercent: 100 })
  ),
  ...[
    [568, 320],
    [667, 375],
    [844, 390],
  ].map(([width, height]) => ({ width, height, textPercent: 100 })),
  ...[320, 375, 640, 768, 1024, 1440].map((width) => ({ width, height: 900, textPercent: 200 })),
]
  .map((scenario) => ({ ...scenario, reservedScrollbar: false }))
  .concat(
    [320, 640].map((width) => ({
      width,
      height: 900,
      textPercent: 200,
      reservedScrollbar: true,
    }))
  )

for (const { width, height, textPercent, reservedScrollbar } of scenarios) {
  test.describe(`offline feedback cards at ${width}px, ${textPercent}% text${reservedScrollbar ? ", reserved scrollbar" : ""}`, () => {
    test.use({ viewport: { width, height } })

    test("keeps all cards equally high with visible feedback and stable controls", async ({
      page,
    }) => {
      await openPage(page, "/crisis", textPercent, reservedScrollbar)
      const cards = articles.map((article) =>
        page.locator("div.group").filter({
          has: page.getByRole("heading", { level: 2, name: article.title, exact: true }),
        })
      )
      await expectEqualCardHeights(cards)
      for (const [index, article] of articles.entries()) {
        const card = cards[index]
        const reading = card.getByRole("link", { name: `Läs mer om ${article.title}` })
        await checkSaveAndRemove(
          card,
          [reading, card.getByRole("button")],
          article.title,
          confirmationNames[index]
        )
        await expectEqualCardHeights(cards)
      }
    })
  })
}

for (const { width, textPercent, reservedScrollbar } of [
  { width: 375, textPercent: 100 },
  { width: 1024, textPercent: 100 },
  { width: 320, textPercent: 200 },
  { width: 1024, textPercent: 200 },
]
  .map((scenario) => ({ ...scenario, reservedScrollbar: false }))
  .concat({ width: 320, textPercent: 200, reservedScrollbar: true })) {
  test.describe(`offline feedback detail at ${width}px, ${textPercent}% text${reservedScrollbar ? ", reserved scrollbar" : ""}`, () => {
    test.use({ viewport: { width, height: 900 } })

    test("keeps the standalone action and full confirmation stable", async ({ page }) => {
      const article = articles[1]
      await openPage(page, `/crisis/${article.id}`, textPercent, reservedScrollbar)
      const panel = page.getByRole("article")
      await checkSaveAndRemove(
        panel,
        [panel.getByRole("button")],
        article.title,
        confirmationNames[1]
      )
    })
  })
}
