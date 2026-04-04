import { expect, test, type Page } from "@playwright/test";
import { generateTotpToken } from "@/lib/security/totp";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

async function enrollTwoFactor(page: Page, email: string) {
  await login(page, email);
  await page.goto("/security");
  await page.getByTestId("security-2fa-start").click();
  await expect(page.getByTestId("security-2fa-setup-panel")).toBeVisible();

  const formattedSecret = (await page.getByTestId("security-2fa-secret").textContent()) ?? "";
  const secret = formattedSecret.replace(/\s+/g, "");
  const token = generateTotpToken(secret);

  await page.getByTestId("security-2fa-code-input").fill(token);
  await page.getByTestId("security-2fa-verify").click();
  await expect(page.getByTestId("security-2fa-card-enabled")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  return secret;
}

test("S23: enrolled user must complete a 2FA challenge on login", async ({ page }) => {
  const secret = await enrollTwoFactor(page, "challenge-user@example.com");

  await page.getByLabel("Email").fill("challenge-user@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("two-factor-form")).toBeVisible();
  await expect(page.getByTestId("nav-auth-state")).toHaveText("Signed out");

  await page.getByTestId("login-2fa-code-input").fill(generateTotpToken(secret));
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByTestId("nav-auth-state")).toContainText("challenge-user@example.com");
});

test("S23: invalid 2FA code keeps the user on the login challenge step", async ({ page }) => {
  await enrollTwoFactor(page, "challenge-error@example.com");

  await page.getByLabel("Email").fill("challenge-error@example.com");
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId("login-2fa-code-input").fill("000000");
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page.getByTestId("login-2fa-error")).toContainText("Verification code is invalid");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});
