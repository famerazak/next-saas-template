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
  const token = generateTotpToken(formattedSecret.replace(/\s+/g, ""));

  await page.getByTestId("security-2fa-code-input").fill(token);
  await page.getByTestId("security-2fa-verify").click();
  await expect(page.getByTestId("security-2fa-card-enabled")).toBeVisible();
}

test("S24: unauthenticated user is redirected from security to login", async ({ page }) => {
  await page.goto("/security");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S24: enrolled user can generate and view backup codes", async ({ page }) => {
  await enrollTwoFactor(page, "backup-codes-user@example.com");

  await expect(page.getByTestId("security-backup-codes-card")).toBeVisible();
  await expect(page.getByTestId("security-backup-codes-remaining")).toContainText("0 codes available");

  await page.getByTestId("security-backup-codes-generate").click();

  await expect(page.getByTestId("security-backup-codes-success")).toContainText("only shown once");
  await expect(page.getByTestId("security-backup-codes-reveal")).toBeVisible();
  await expect(page.getByTestId("security-backup-codes-remaining")).toContainText("8 codes available");
  await expect(page.getByTestId("security-backup-code-1")).toHaveText(/[A-Z2-9]{4}-[A-Z2-9]{4}/);
  await expect(page.getByTestId("security-backup-code-8")).toHaveText(/[A-Z2-9]{4}-[A-Z2-9]{4}/);

  await page.reload();

  await expect(page.getByTestId("security-backup-codes-card")).toBeVisible();
  await expect(page.getByTestId("security-backup-codes-reveal")).toHaveCount(0);
  await expect(page.getByTestId("security-backup-codes-remaining")).toContainText("8 codes available");
  await expect(page.getByTestId("security-events-section")).toContainText("Backup codes ready");
});

test("S24: non-enrolled user sees backup code setup guidance", async ({ page }) => {
  await login(page, "backup-codes-pending@example.com");
  await page.goto("/security");

  await expect(page.getByTestId("security-backup-codes-disabled")).toContainText(
    "Enable an authenticator app first"
  );
  await expect(page.getByTestId("security-backup-codes-generate")).toHaveCount(0);
});
