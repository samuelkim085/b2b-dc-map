import { expect, type Locator, type Page } from "@playwright/test";

export async function gotoMap(page: Page) {
  await page.goto("/");
  await expect(page.locator(".shipments-map-svg")).toBeVisible();
  await expect(page.locator(".state-geography").first()).toBeVisible({
    timeout: 15000,
  });
  await expect
    .poll(async () => page.locator(".dc-marker").count(), {
      timeout: 15000,
    })
    .toBeGreaterThan(10);
}

export async function ensureSectionOpen(page: Page, name: string) {
  const toggle = page.getByRole("button", { name });
  const expanded = await toggle.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await toggle.click();
  }
}

export async function getSvgBBox(locator: Locator) {
  return locator.evaluate((node) => {
    const bbox = (node as SVGGraphicsElement).getBBox();
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };
  });
}

export function getScaleFromTransform(transform: string | null) {
  if (!transform) return 1;
  const match = transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : 1;
}
