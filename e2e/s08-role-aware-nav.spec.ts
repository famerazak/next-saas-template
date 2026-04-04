import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S08: owner sees tenant admin sidebar links", async ({ page }) => {
  await login(page, "owner@example.com");
  await expect(page.getByTestId("sidebar-link-security")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-team")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-billing")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-audit-logs")).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Team" })).toHaveCount(0);
});

test("S08: admin sees tenant admin sidebar links", async ({ page }) => {
  await login(page, "admin@example.com");
  await expect(page.getByTestId("sidebar-link-security")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-team")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-billing")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-link-audit-logs")).toBeVisible();
});

test("S08: member sees dashboard and security in the sidebar", async ({ page }) => {
  await login(page, "member@example.com");
  await expect(page.getByTestId("sidebar-link-dashboard")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-security")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-team")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-link-billing")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-link-audit-logs")).toHaveCount(0);
  await expect(page.getByTestId("header-profile-avatar")).toBeVisible();
});
