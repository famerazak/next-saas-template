import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

async function seedTenant(page: Page, input: { ownerEmail: string; tenantName: string }) {
  await login(page, input.ownerEmail);
  await page.goto("/settings/tenant");
  await page.getByTestId("tenant-name-input").fill(input.tenantName);
  await page.getByRole("button", { name: "Save tenant settings" }).click();
  await expect(page.getByTestId("tenant-settings-success")).toContainText("Tenant settings updated.");
  await logout(page);
}

test("S58: unauthenticated user is redirected from platform settings to login", async ({ page }) => {
  await page.goto("/platform/settings");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S58: non-platform user sees no-access UX on platform settings", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/platform/settings");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
});

test("S58: platform admin can update global settings and tenant overrides", async ({ page }) => {
  const ownerEmail = "owner@platformsettings.com";
  const tenantName = "Platform Settings Workspace";

  await seedTenant(page, { ownerEmail, tenantName });

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await page.getByTestId("platform-home-link-settings").click();

  await expect(page).toHaveURL(/\/platform\/settings$/, { timeout: 15_000 });
  await expect(page.getByTestId("platform-settings-page")).toBeVisible();

  await page.getByTestId("platform-global-flag-audit-exports").uncheck();
  await page.getByTestId("platform-audit-retention-days").fill("730");
  await page.getByTestId("platform-session-retention-days").fill("120");
  await page.getByTestId("platform-tenant-2fa-default").selectOption("recommended");
  await page.getByTestId("platform-global-settings-save").click();

  await expect(page.getByTestId("platform-global-settings-success")).toContainText("Platform system settings updated.");
  await page.reload();
  await expect(page.getByTestId("platform-audit-retention-days")).toHaveValue("730");
  await expect(page.getByTestId("platform-session-retention-days")).toHaveValue("120");
  await expect(page.getByTestId("platform-tenant-2fa-default")).toHaveValue("recommended");

  await page.getByTestId("platform-tenant-flags-search").fill(tenantName);
  const tenantCard = page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first();
  await tenantCard.getByRole("button", { name: "Open detail" }).click();
  await expect(page.getByTestId("platform-tenant-flags-detail-name")).toContainText(tenantName);

  await page.getByTestId("platform-tenant-flag-priority-support").check();
  await page.getByTestId("platform-tenant-flag-strict-exports").check();
  await page.getByTestId("platform-tenant-flags-save").click();

  await expect(page.getByTestId("platform-tenant-flags-success")).toContainText(
    `Tenant flags updated for ${tenantName}.`
  );
  await page.reload();
  await page.getByTestId("platform-tenant-flags-search").fill(tenantName);
  await page.locator(".platform-tenant-card").filter({ hasText: tenantName }).first().getByRole("button", { name: "Open detail" }).click();
  await expect(page.getByTestId("platform-tenant-flag-priority-support")).toBeChecked();
  await expect(page.getByTestId("platform-tenant-flag-strict-exports")).toBeChecked();

  await logout(page);

  await login(page, ownerEmail);
  await page.goto("/audit-logs");
  await expect(page.getByTestId("audit-log-list")).toContainText(`Platform updated tenant flags for ${tenantName}.`);
  await expect(page.getByTestId("audit-log-list")).toContainText("platform.flags.updated");
});
