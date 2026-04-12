import { expect, test, type Page } from "@playwright/test";

async function signup(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("Q01: fresh account can sign up, log out, log back in, and recover dashboard access", async ({ page }) => {
  const stamp = String(Date.now());
  const email = `q01-owner-${stamp}@starter-${stamp}.test`;
  const password = "supersecret";

  await signup(page, email, password);

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-email")).toContainText(email);
  await expect(page.getByTestId("tenant-role")).toContainText("Owner");
  await expect(page.getByTestId("nav-auth-state")).toContainText(email);
  await expect(page.getByTestId("app-sidebar")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-dashboard")).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
  await expect(page.getByTestId("nav-auth-state")).toHaveText("Signed out");
  await expect(page.getByTestId("app-sidebar")).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

  await login(page, email, password);

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-email")).toContainText(email);
  await expect(page.getByTestId("tenant-role")).toContainText("Owner");
  await expect(page.getByTestId("tenant-name")).toContainText("Workspace");
  await expect(page.getByTestId("header-profile-avatar")).toBeVisible();
  await expect(page.getByTestId("sidebar-link-dashboard")).toHaveAttribute("aria-current", "page");
});
