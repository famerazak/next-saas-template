import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S48: unauthenticated users are redirected from platform home to login", async ({ page }) => {
  await page.goto("/platform");
  await expect(page).toHaveURL(/\/login$/);
});

test("S48: non-platform users do not see platform nav and cannot access platform routes", async ({ page }) => {
  await login(page, "owner@example.com");

  await expect(page.getByTestId("sidebar-link-platform")).toHaveCount(0);

  await page.goto("/platform");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByText("Your role does not allow access to the platform operations area.")).toBeVisible();
});

test("S48: platform admins see platform nav and can open platform home", async ({ page }) => {
  await login(page, "platform-admin@example.com");

  await expect(page.getByTestId("sidebar-link-platform")).toBeVisible();
  await page.getByTestId("sidebar-link-platform").click();

  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByTestId("platform-home-page")).toBeVisible();
  await expect(page.getByTestId("platform-home-card-webhooks")).toContainText("Webhook jobs");
  await expect(page.getByTestId("platform-home-link-webhooks")).toBeVisible();
});
