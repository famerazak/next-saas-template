import { expect, test } from "@playwright/test";

test("S03: signup response includes tenant and owner role context", async ({ page }) => {
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "user_123",
        redirectTo: "/dashboard",
        tenantId: "tenant_123",
        tenantName: "Acme Workspace",
        role: "Owner"
      })
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Work email").fill("owner@acme.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("tenant-name")).toHaveText("Tenant: Acme Workspace");
  await expect(page.getByTestId("tenant-role")).toHaveText("Role: Owner");
});
