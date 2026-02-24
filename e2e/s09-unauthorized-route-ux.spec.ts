import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S09: disallowed member sees clear no-access UX for admin routes", async ({ page }) => {
  await login(page, "member@example.com");

  for (const route of ["/team", "/billing", "/audit-logs"]) {
    await page.goto(route);
    await expect(page.getByTestId("no-access-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No access" })).toBeVisible();
    await expect(page.getByText("Ask a tenant admin if you need this permission.")).toBeVisible();
  }
});

test("S09: allowed owner still reaches admin route content", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByTestId("no-access-card")).toHaveCount(0);
});
