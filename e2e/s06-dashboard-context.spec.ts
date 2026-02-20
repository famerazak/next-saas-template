import { expect, test } from "@playwright/test";

test("S06: dashboard shows tenant and role context from session after signup", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill("owner@acme.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByTestId("dashboard-email")).toHaveText("Email: owner@acme.com");
  await expect(page.getByTestId("tenant-name")).toHaveText("Tenant: Acme Workspace");
  await expect(page.getByTestId("tenant-role")).toHaveText("Role: Owner");
});

test("S06: dashboard ignores tenant context query string tampering", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await page.goto("/dashboard?tenantName=Hacked%20Workspace&role=Viewer");

  await expect(page.getByTestId("dashboard-email")).toHaveText("Email: owner@example.com");
  await expect(page.getByTestId("tenant-name")).toHaveText("Tenant: Example Workspace");
  await expect(page.getByTestId("tenant-role")).toHaveText("Role: Owner");
});
