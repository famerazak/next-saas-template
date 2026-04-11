import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S68: unauthenticated user is redirected from platform diagnostics to login", async ({ page }) => {
  await page.goto("/platform/diagnostics");
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("S68: non-platform user sees no-access UX on platform diagnostics", async ({ page }) => {
  await login(page, "owner@example.com");
  await page.goto("/platform/diagnostics");
  await expect(page.getByTestId("no-access-card")).toBeVisible();
});

test("S68: platform admin can review header diagnostics and new app errors", async ({ page }) => {
  const privacyResponse = await page.request.get("/privacy");
  expect(privacyResponse.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(privacyResponse.headers()["x-frame-options"]).toBe("DENY");
  expect(privacyResponse.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      email: "anyone@example.com",
      password: "supersecret"
    }
  });
  expect(loginResponse.headers()["content-security-policy"]).toContain("default-src 'none'");
  expect(loginResponse.headers()["x-content-type-options"]).toBe("nosniff");

  await login(page, "platform-admin@example.com");
  await page.goto("/platform");
  await page.getByTestId("platform-home-link-diagnostics").click();

  await expect(page).toHaveURL(/\/platform\/diagnostics$/, { timeout: 15_000 });
  await expect(page.getByTestId("platform-diagnostics-page")).toBeVisible();
  await expect(page.getByTestId("platform-diagnostics-header-profile-browser-pages")).toContainText("Content-Security-Policy");
  await expect(page.getByTestId("platform-diagnostics-header-profile-api-routes")).toContainText("CSP: Configured");

  await page.getByTestId("platform-diagnostics-generate-error").click();
  await expect(page.getByTestId("platform-diagnostics-success")).toContainText("Diagnostics test error recorded.");
  await expect(page.getByTestId("platform-diagnostics-error-list")).toContainText(
    "Simulated starter error for diagnostics validation."
  );
  await expect(page.getByTestId("platform-diagnostics-error-list")).toContainText("platform.diagnostics.test");
});
