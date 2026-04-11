import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
}

test("S71: platform diagnostics shows operator-facing config health guidance", async ({ page }) => {
  await login(page, "platform-admin@example.com");
  await page.goto("/platform/diagnostics");

  await expect(page.getByTestId("platform-diagnostics-config-feed")).toBeVisible();
  await expect(page.getByTestId("platform-diagnostics-config-summary")).toContainText("starter-mode checks");

  const runtimeCard = page.getByTestId("platform-diagnostics-config-runtime-mode");
  await expect(runtimeCard).toContainText("Starter mode");
  await expect(runtimeCard).toContainText("E2E auth bypass is active");
  await expect(runtimeCard).toContainText("E2E_AUTH_BYPASS");

  const supabaseCard = page.getByTestId("platform-diagnostics-config-supabase-public-auth");
  await expect(supabaseCard).toContainText("NEXT_PUBLIC_SUPABASE_URL");
  await expect(supabaseCard).toContainText("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const stripeCard = page.getByTestId("platform-diagnostics-config-stripe-webhook-secret");
  await expect(stripeCard).toContainText("STRIPE_WEBHOOK_SECRET");
  await expect(stripeCard).toContainText("Set STRIPE_WEBHOOK_SECRET before connecting live Stripe webhooks.");
});
