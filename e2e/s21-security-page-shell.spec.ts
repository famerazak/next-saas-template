import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S21: unauthenticated user is redirected from security to login", async ({ page }) => {
  await page.goto("/security");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("S21: signed-in user can open security page and see personal event history", async ({ page }) => {
  await login(page, "member@example.com");

  await expect(page.getByTestId("sidebar-link-security")).toBeVisible();
  await page.getByTestId("sidebar-link-security").click();

  await expect(page).toHaveURL(/\/security$/);
  await expect(page.getByTestId("security-page")).toBeVisible();
  await expect(page.getByTestId("security-2fa-section")).toContainText("Coming in S22");
  await expect(page.getByTestId("security-sessions-section")).toContainText("Coming in S25");
  await expect(page.getByTestId("security-events-section")).toContainText("Current session active");
  await expect(page.getByTestId("security-events-section")).toContainText("2FA enrollment pending");
});

test("S21: admin sees tenant policy placeholder with admin preview state", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/security");

  await expect(page.getByTestId("security-policy-section")).toContainText("Admin preview");
  await expect(page.getByTestId("security-policy-section")).toContainText(
    "Owner/Admin will manage tenant-wide policy"
  );
});
