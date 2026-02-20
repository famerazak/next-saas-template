import { expect, test } from "@playwright/test";

test("S07: unauthenticated user is redirected to login for profile settings", async ({ page }) => {
  await page.goto("/settings/profile");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S07: authenticated user can update profile info", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);

  await page.getByLabel("Full name").fill("Alex Johnson");
  await page.getByLabel("Job title").fill("Operations Manager");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByTestId("profile-success")).toHaveText("Profile updated.");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Alex Johnson");
  await expect(page.getByLabel("Job title")).toHaveValue("Operations Manager");
});
