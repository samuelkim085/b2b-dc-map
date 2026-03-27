import { expect, test } from "@playwright/test";
import { gotoMap } from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await gotoMap(page);
});

test("renders app shell and export controls", async ({ page }) => {
  await expect(page.locator(".app-bar-title")).toHaveText("B2B DC MAP");
  await expect(page.getByRole("button", { name: "SVG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PNG" })).toBeVisible();
});

test("renders state map and dc markers", async ({ page }) => {
  await expect
    .poll(async () => page.locator(".state-geography").count())
    .toBeGreaterThan(50);
  await expect(page.locator(".dc-marker").first()).toBeVisible();
});

test("shows dc tooltip on marker hover", async ({ page }) => {
  await page.locator(".dc-marker").first().hover({ force: true });
  await expect(page.locator(".map-tooltip")).toBeVisible();
  await expect(page.locator(".map-tooltip")).toContainText("pcs");
});

test("defaults dc customer filter to all except HEB", async ({ page }) => {
  const tags = page
    .locator(".customer-dropdown")
    .nth(1)
    .locator(".customer-tag");
  await expect(tags).toHaveCount(6);
  await expect(page.locator(".customer-dropdown").nth(1)).not.toContainText(
    "HEB",
  );
});
