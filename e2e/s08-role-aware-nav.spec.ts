import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S08: owner sees tenant admin nav links", async ({ page }) => {
  await login(page, "owner@example.com");
  await expect(page.getByTestId("nav-link-team")).toBeVisible();
  await expect(page.getByTestId("nav-link-billing")).toBeVisible();
  await expect(page.getByTestId("nav-link-audit-logs")).toBeVisible();
});

test("S08: admin sees tenant admin nav links", async ({ page }) => {
  await login(page, "admin@example.com");
  await expect(page.getByTestId("nav-link-team")).toBeVisible();
  await expect(page.getByTestId("nav-link-billing")).toBeVisible();
  await expect(page.getByTestId("nav-link-audit-logs")).toBeVisible();
});

test("S08: member does not see tenant admin nav links", async ({ page }) => {
  await login(page, "member@example.com");
  await expect(page.getByTestId("nav-link-team")).toHaveCount(0);
  await expect(page.getByTestId("nav-link-billing")).toHaveCount(0);
  await expect(page.getByTestId("nav-link-audit-logs")).toHaveCount(0);
});
