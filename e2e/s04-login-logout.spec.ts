import { expect, test } from "@playwright/test";

test("S04: login and logout updates session lifecycle and nav state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("nav-auth-state")).toHaveText("Signed out");

  await page.getByRole("link", { name: "Log in" }).click();
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
  await expect(page.getByTestId("nav-auth-state")).toContainText("owner@example.com");
  await expect(page.getByTestId("app-sidebar")).toBeVisible();
  await expect(page.getByTestId("header-profile-avatar")).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("nav-auth-state")).toHaveText("Signed out");
  await expect(page.getByTestId("app-sidebar")).toHaveCount(0);
});

test("S04: login error message is shown on failed authentication", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Invalid credentials." })
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByTestId("login-error")).toHaveText("Invalid credentials.");
  await expect(page).toHaveURL(/\/login$/);
});
