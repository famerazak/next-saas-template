import { expect, test, type Browser, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function openSecondSession(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}

test("S25: unauthenticated user is redirected from security to login", async ({ page }) => {
  await page.goto("/security");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S25: user can see active sessions and revoke another browser session", async ({
  browser,
  page
}) => {
  const email = "session-owner@example.com";

  await login(page, email);
  const second = await openSecondSession(browser, email);

  await page.goto("/security");

  await expect(page.getByTestId("security-session-count")).toContainText("2 active sessions");
  await expect(page.locator('[data-testid^="security-session-row-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="security-session-current-badge-"]')).toHaveCount(1);

  const revokeButton = page.locator('[data-testid^="security-session-revoke-"]').first();
  await expect(revokeButton).toBeVisible();
  await revokeButton.click();

  await expect(page.getByTestId("security-session-success")).toHaveText("Session revoked.");
  await expect(page.getByTestId("security-session-count")).toContainText("1 active session");
  await expect(page.locator('[data-testid^="security-session-row-"]')).toHaveCount(1);

  await second.page.goto("/dashboard");
  await expect(second.page).toHaveURL(/\/login$/);

  await second.context.close();
});
