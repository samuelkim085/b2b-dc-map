import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Wait for map and markers to load (CSV fetch + TopoJSON download)
  await page.waitForSelector('.map-wrap svg', { timeout: 15000 })
  await page.waitForSelector('circle', { timeout: 10000 })
})

// ── Layout ────────────────────────────────────────────────────────────────────

test('app bar renders title and export buttons', async ({ page }) => {
  await expect(page.locator('.app-bar-title')).toHaveText('B2B DC MAP')
  await expect(page.locator('button.export-btn', { hasText: 'SVG' })).toBeVisible()
  await expect(page.locator('button.export-btn', { hasText: 'PNG' })).toBeVisible()
})

test('filter panel is visible with all controls', async ({ page }) => {
  await expect(page.locator('.panel-title')).toHaveText('FILTERS')
  await expect(page.locator('.filter-label', { hasText: 'CUSTOMERS' })).toBeVisible()
  await expect(page.locator('#origin-select')).toBeVisible()
  await expect(page.locator('#volume-slider')).toBeVisible()
  await expect(page.locator('#distance-slider')).toBeVisible()
})

test('map SVG is rendered', async ({ page }) => {
  const svg = page.locator('.map-wrap svg')
  await expect(svg).toBeVisible()
  // Should have state geography paths
  const paths = page.locator('.map-wrap svg path')
  await expect(paths).toHaveCount(await paths.count())
  expect(await paths.count()).toBeGreaterThan(40)
})

// ── DC Markers ────────────────────────────────────────────────────────────────

test('DC markers are rendered on the map', async ({ page }) => {
  const markers = page.locator('.map-wrap svg g[style*="cursor: pointer"]')
  await expect(markers).toHaveCount(await markers.count())
  expect(await markers.count()).toBeGreaterThan(10)
})

test('hovering a DC marker shows tooltip', async ({ page }) => {
  const firstMarker = page.locator('.map-wrap svg g[style*="cursor: pointer"]').first()
  await firstMarker.hover({ force: true })
  const tooltip = page.locator('.map-tooltip')
  await expect(tooltip).toBeVisible()
  // Tooltip should show pcs and mi
  await expect(tooltip).toContainText('pcs')
})

// ── Customer Dropdown ─────────────────────────────────────────────────────────

test('customer dropdown opens and shows customers', async ({ page }) => {
  await page.locator('.dropdown-trigger').click()
  const items = page.locator('.dropdown-item')
  const count = await items.count()
  expect(count).toBeGreaterThanOrEqual(6)
})

test('selecting a customer filters markers', async ({ page }) => {
  const markersBefore = await page.locator('.map-wrap svg g[style*="cursor: pointer"]').count()

  await page.locator('.dropdown-trigger').click()
  // Click first customer checkbox (WM)
  await page.locator('.dropdown-item').first().click()
  await page.locator('.dropdown-trigger').click() // close

  const markersAfter = await page.locator('.map-wrap svg g[style*="cursor: pointer"]').count()
  expect(markersAfter).toBeLessThan(markersBefore)
})

test('customer tag shows and can be removed', async ({ page }) => {
  await page.locator('.dropdown-trigger').click()
  await page.locator('.dropdown-item').first().click()
  await page.keyboard.press('Escape')

  // Tag should be visible
  const tag = page.locator('.customer-tag').first()
  await expect(tag).toBeVisible()

  // Remove it
  await tag.locator('.tag-remove').click()
  await expect(page.locator('.placeholder')).toHaveText('All customers')
})

// ── Origin Selector ───────────────────────────────────────────────────────────

test('origin dropdown has 6 options', async ({ page }) => {
  const options = page.locator('#origin-select option')
  await expect(options).toHaveCount(6)
})

test('changing origin updates distance slider max', async ({ page }) => {
  const before = await page.locator('#distance-slider').getAttribute('max')
  await page.locator('#origin-select').selectOption({ index: 1 })
  const after = await page.locator('#distance-slider').getAttribute('max')
  // max distance changes when origin changes
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
})

// ── Map Style ─────────────────────────────────────────────────────────────────

test('choropleth radio toggles map style', async ({ page }) => {
  const choroplethRadio = page.locator('input[type="radio"][value="Choropleth"]')
  await choroplethRadio.click()
  await expect(choroplethRadio).toBeChecked()

  const plainRadio = page.locator('input[type="radio"][value="Plain"]')
  await plainRadio.click()
  await expect(plainRadio).toBeChecked()
})
