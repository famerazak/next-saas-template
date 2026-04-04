import { expect, test } from "@playwright/test";

test("S28: repeated failed logins show a clear cooldown message", async ({ page }) => {
  await page.goto("/login");

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.getByLabel("Email").fill("auth-abuse@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByTestId("login-error")).toHaveText("Invalid credentials.");
  }

  await page.getByLabel("Email").fill("auth-abuse@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByTestId("login-error")).toContainText("Too many attempts");
  await expect(page.getByTestId("login-error")).toContainText("10 minutes");
});

test("S28: signup shows a clear captcha verification message", async ({ page }) => {
  await page.route("**/api/auth/signup", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        code: "captcha_required",
        error: "We need an extra verification step before you can continue.",
        hint: "Refresh the page and complete the verification step before trying again."
      })
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Work email").fill("captcha-required@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByTestId("signup-error")).toContainText(
    "We need an extra verification step before you can continue."
  );
  await expect(page.getByTestId("signup-error")).toContainText(
    "Refresh the page and complete the verification step before trying again."
  );
});
