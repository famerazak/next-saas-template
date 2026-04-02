import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S10: unauthenticated user is redirected from tenant settings to login", async ({ page }) => {
  await page.goto("/settings/tenant");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S10: admin can update tenant settings", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/settings/tenant");

  await expect(page.getByTestId("tenant-settings-page")).toBeVisible();
  await expect(page.getByTestId("tenant-settings-role")).toHaveText("Admin");
  await page.getByTestId("tenant-name-input").fill("Northwind Workspace");
  await page.getByRole("button", { name: "Save tenant settings" }).click();

  await expect(page.getByTestId("tenant-settings-success")).toHaveText("Tenant settings updated.");
  await page.reload();
  await expect(page.getByTestId("tenant-name-input")).toHaveValue("Northwind Workspace");
});

test("S10: member sees no-access UX on tenant settings", async ({ page }) => {
  await login(page, "member@example.com");
  await page.goto("/settings/tenant");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
});
