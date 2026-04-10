import { expect, test, type Page } from "@playwright/test";

async function getConsentCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "analytics_consent")?.value ?? null;
}

test("S65: first-time visitor can accept analytics cookies and the banner stays dismissed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  await page.getByTestId("cookie-consent-accept").click();
  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect.poll(() => getConsentCookie(page)).toBe("accepted");

  await page.reload();
  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
});

test("S65: visitor can reject analytics cookies and keep that choice across auth pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("cookie-consent-banner")).toBeVisible();
  await page.getByTestId("cookie-consent-reject").click();
  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect.poll(() => getConsentCookie(page)).toBe("rejected");

  await page.goto("/login");
  await expect(page.getByTestId("cookie-consent-banner")).toHaveCount(0);
  await expect(page.getByTestId("auth-form")).toBeVisible();
});
