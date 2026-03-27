import { expect, test } from "@playwright/test";
import { getScaleFromTransform, gotoMap } from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await gotoMap(page);
});

test("ctrl wheel zoom adjusts map scale in small increments", async ({
  page,
}) => {
  const viewport = page.locator(".map-viewport");
  const map = page.locator(".shipments-map-svg");

  const before = getScaleFromTransform(await viewport.getAttribute("transform"));
  await map.hover();
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -120);
  await page.keyboard.up("Control");

  await expect
    .poll(async () =>
      getScaleFromTransform(await viewport.getAttribute("transform")),
    )
    .toBeGreaterThan(before);

  const after = getScaleFromTransform(await viewport.getAttribute("transform"));
  expect(after).toBeLessThan(before + 0.5);
});

test("marker hover yields to flow hover tooltip", async ({ page }) => {
  await page.locator(".dc-marker").first().hover({ force: true });
  await expect(page.locator(".map-tooltip")).toContainText("pcs");

  await page.locator(".flow-route--outbound .flow-path").first().hover({
    force: true,
  });
  await expect(page.locator(".map-tooltip")).toContainText("Outbound Flow");
});
