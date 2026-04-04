import { expect, test, type Page } from "@playwright/test";
import { generateTotpToken } from "@/lib/security/totp";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S22: unauthenticated user is redirected from security to login", async ({ page }) => {
  await page.goto("/security");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S22: signed-in user can enroll in 2FA from the security page", async ({ page }) => {
  await login(page, "totp-user@example.com");
  await page.goto("/security");

  await page.getByTestId("security-2fa-start").click();
  await expect(page.getByTestId("security-2fa-setup-panel")).toBeVisible();
  await expect(page.getByTestId("security-2fa-qr")).toBeVisible();

  const formattedSecret = (await page.getByTestId("security-2fa-secret").textContent()) ?? "";
  const token = generateTotpToken(formattedSecret.replace(/\s+/g, ""));

  await page.getByTestId("security-2fa-code-input").fill(token);
  await page.getByTestId("security-2fa-verify").click();

  await expect(page.getByTestId("security-2fa-card-enabled")).toBeVisible();
  await expect(page.getByTestId("security-2fa-enabled-label")).toHaveText("Enabled");

  await page.reload();
  await expect(page.getByTestId("security-events-section")).toContainText("2FA enabled");
  await expect(page.getByTestId("security-2fa-masked-secret")).toBeVisible();
});

test("S22: invalid authenticator code shows an inline error", async ({ page }) => {
  await login(page, "totp-error@example.com");
  await page.goto("/security");

  await page.getByTestId("security-2fa-start").click();
  await expect(page.getByTestId("security-2fa-setup-panel")).toBeVisible();

  await page.getByTestId("security-2fa-code-input").fill("000000");
  await page.getByTestId("security-2fa-verify").click();

  await expect(page.getByTestId("security-2fa-error")).toContainText("Verification code is invalid");
  await expect(page.getByTestId("security-2fa-card-pending")).toBeVisible();
});
