import { expect, test } from "@playwright/test";

test("S03: signup response includes tenant and owner role context", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill("owner@acme.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByTestId("tenant-name")).toHaveText("Tenant: Acme Workspace");
  await expect(page.getByTestId("tenant-role")).toHaveText("Role: Owner");
});
