import { expect, test } from "@playwright/test";
import { gotoMap } from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await gotoMap(page);
});

test("toggles flow layer visibility", async ({ page }) => {
  await expect(page.locator(".flow-route")).toHaveCount(7);
  await page.getByRole("checkbox", { name: "Show flows" }).uncheck();
  await expect(page.locator(".flow-route")).toHaveCount(0);
});

test("straight inland lines toggles outbound geometry between line and curve", async ({
  page,
}) => {
  const outboundPath = page.locator(".flow-route--outbound .flow-path").first();
  await expect(outboundPath).toHaveAttribute("d", / L /);

  await page.getByRole("checkbox", { name: "Straight inland lines" }).uncheck();
  await expect(outboundPath).toHaveAttribute("d", / C /);
});

test("manual and top n destination modes update outbound route count", async ({
  page,
}) => {
  await expect(page.locator(".flow-route--outbound")).toHaveCount(5);

  await page.getByLabel("DESTINATION MODE").selectOption("topN");
  await page.getByLabel("Top N flow destinations").fill("3");
  await page.getByLabel("Top N flow destinations").press("Enter");

  await expect(page.locator(".flow-route--outbound")).toHaveCount(3);
});

test("changing origin updates inbound routing labels", async ({ page }) => {
  const tooltip = page.locator(".map-tooltip");

  // Uncheck Extend map to Panama to restore the projection used in tests
  await page
    .locator(".panel-section-toggle")
    .filter({ hasText: "Map View" })
    .click();
  await page.getByRole("checkbox", { name: "Extend map to Panama" }).uncheck();

  await page
    .locator('[data-route-id^="inbound-domestic-"] .flow-path')
    .hover({ force: true });
  await expect(tooltip).toContainText("Riverside, CA");
  await expect(tooltip).toContainText("Dallas, TX");

  await page.locator("#origin-select").selectOption("91764");
  await expect(page.locator(".flow-route--inbound")).toHaveCount(1);
});
