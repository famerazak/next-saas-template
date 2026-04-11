import { expect, test, type BrowserContext, type Page } from "@playwright/test";

type AnalyticsState = {
  active: boolean;
  consent: "unknown" | "accepted" | "rejected";
  measurementId: string | null;
  pageViews: number;
  lastPagePath: string | null;
};

async function readAnalyticsState(page: Page): Promise<AnalyticsState | null> {
  return page.evaluate(() => window.__analyticsState ?? null);
}

async function setConsentCookie(context: BrowserContext, value: "accepted" | "rejected") {
  await context.addCookies([
    {
      name: "analytics_consent",
      value,
      url: "http://127.0.0.1:3100"
    }
  ]);
}

test("S66: GA stays inactive until consent is accepted", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-consent", "unknown");
  await expect(page.locator("script#ga-loader")).toHaveCount(0);

  await page.getByTestId("cookie-consent-reject").click();

  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-consent", "rejected");
  await expect(page.locator("script#ga-loader")).toHaveCount(0);
});

test("S66: accepting consent activates GA runtime and tracks page views", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("cookie-consent-accept").click();

  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-consent", "accepted");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-measurement-id", "G-E2E000001");
  await expect(page.locator("script#ga-loader")).toHaveCount(1);

  await expect.poll(async () => {
    const state = await readAnalyticsState(page);
    return state?.pageViews ?? 0;
  }).toBeGreaterThan(0);

  await page.goto("/login");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-active", "true");
  await expect.poll(async () => {
    const state = await readAnalyticsState(page);
    return state?.lastPagePath;
  }).toBe("/login");
});

test("S66: previously accepted consent boots GA without showing the banner again", async ({ page, context }) => {
  await setConsentCookie(context, "accepted");
  await page.goto("/signup");

  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("ga-runtime-state")).toHaveAttribute("data-consent", "accepted");
  await expect(page.locator("script#ga-loader")).toHaveCount(1);
});
