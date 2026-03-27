import { expect, test } from "@playwright/test";
import { ensureSectionOpen, getSvgBBox, gotoMap } from "./test-helpers";

test.beforeEach(async ({ page }) => {
  await gotoMap(page);
});

test("shows radius ring and updates it when center and miles change", async ({
  page,
}) => {
  await ensureSectionOpen(page, "Radius Ring");
  await page.getByRole("checkbox", { name: "Show radius ring" }).check();

  const ring = page.locator(".origin-radius-ring");
  await expect(ring).toBeVisible();

  const before = await getSvgBBox(ring);

  await page.getByLabel("RING CENTER").selectOption("91764");
  const moved = await getSvgBBox(ring);
  expect(moved.x).not.toBe(before.x);

  await page.getByLabel("Origin radius miles").fill("1500");
  await page.getByLabel("Origin radius miles").press("Enter");
  const expanded = await getSvgBBox(ring);
  expect(expanded.width).toBeGreaterThan(moved.width);
  expect(expanded.height).toBeGreaterThan(moved.height);
});

test("extends map to panama and exposes projection controls", async ({
  page,
}) => {
  await ensureSectionOpen(page, "Map View");
  await page.getByRole("checkbox", { name: "Extend map to Panama" }).check();

  await expect(page.locator(".country-geography").first()).toBeVisible();
  await expect
    .poll(async () => page.locator(".country-geography").count())
    .toBeGreaterThan(10);
  await expect(page.locator(".country-geography--panama")).toHaveCount(1);
});

test("projection sliders move the extended map viewport", async ({ page }) => {
  await ensureSectionOpen(page, "Map View");
  await page.getByRole("checkbox", { name: "Extend map to Panama" }).check();

  const statePaths = page.locator(".state-geography");
  const before = await getSvgBBox(statePaths.first());

  await ensureSectionOpen(page, "Map View");
  const lonSlider = page.getByRole("slider", {
    name: "PROJECTION CENTER LONGITUDE",
  });
  await lonSlider.focus();
  await lonSlider.press("ArrowRight");
  await lonSlider.press("ArrowRight");
  await lonSlider.press("ArrowRight");
  await lonSlider.press("ArrowRight");

  const after = await getSvgBBox(statePaths.first());
  expect(after.x).not.toBe(before.x);
});
