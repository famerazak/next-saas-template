import { expect, test } from "@playwright/test";

test("S02: successful signup redirects to dashboard", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill("owner@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByTestId("nav-auth-state")).toContainText("owner@example.com");
});

test("S02: failed signup shows API error message", async ({ page }) => {
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Email already registered." })
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Work email").fill("owner@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByTestId("signup-error")).toHaveText("Email already registered.");
  await expect(page).toHaveURL(/\/signup$/);
});
